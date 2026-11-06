import {test} from "node:test";
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp, readFile, rm, writeFile, appendFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {parseFile} from "music-metadata";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {TagService} from "../src/main/services/tags.ts";
import {tagPatchSchema} from "../src/shared/tags.ts";

const run = promisify(execFile);

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), "btunes-tags-"));
    const wav = Buffer.alloc(44 + 16000);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(16000, 40);
    await writeFile(join(root, "source.wav"), wav);
    await run("ffmpeg", [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=green:s=32x32",
        "-frames:v",
        "1",
        join(root, "cover.png"),
    ]);

    const repo = new LibraryRepository(":memory:");

    async function index(path: string) {
        const metadata = await parseFile(path);
        repo.upsert({
            path,
            title: metadata.common.title || "Untitled",
            artist: metadata.common.artist || "Unknown artist",
            album: metadata.common.album || "Unknown album",
            genre: metadata.common.genre?.[0] || "Uncategorized",
            year: metadata.common.year || 0,
            duration: metadata.format.duration || 0,
            cover: null,
            size: (await readFile(path)).length,
        });
    }

    async function create(extension: "mp3" | "flac" | "m4a") {
        const path = join(root, "sample." + extension);
        const codec = { mp3: "libmp3lame", flac: "flac", m4a: "aac" }[extension];

        await run("ffmpeg", [
            "-v",
            "error",
            "-i",
            join(root, "source.wav"),
            "-i",
            join(root, "cover.png"),
            "-map",
            "0:a",
            "-map",
            "1:v",
            "-c:a",
            codec,
            "-c:v",
            "copy",
            "-disposition:v",
            "attached_pic",
            "-metadata",
            "title=Before",
            "-metadata",
            "artist=Test artist",
            "-metadata",
            "album=Test album",
            "-metadata",
            "genre=Jazz",
            "-metadata",
            "date=1999",
            "-metadata",
            "track=3",
            "-metadata",
            "comment=Keep this comment",
            path,
        ]);

        await index(path);
        return repo.snapshot().tracks.find((track) => track.path === path)!;
    }

    async function audioHash(path: string) {
        const result = await run("ffmpeg", [
            "-v",
            "error",
            "-i",
            path,
            "-map",
            "0:a",
            "-c",
            "copy",
            "-f",
            "hash",
            "-",
        ]);
        return result.stdout;
    }

    return {
        root,
        repo,
        index,
        create,
        audioHash,
        service: new TagService({ repo, index }, join(root, "backups")),
        async close() {
            repo.db.close();
            await rm(root, { recursive: true, force: true });
        },
    };
}

test("tag edits round-trip MP3, FLAC, and M4A without changing audio or artwork", async () => {
    const f = await fixture();

    try {
        for (const extension of ["mp3", "flac", "m4a"] as const) {
            const track = await f.create(extension);
            f.repo.favorite(track.id);
            const original = await readFile(track.path);
            const before = await parseFile(track.path);
            const hash = await f.audioHash(track.path);
            const preview = await f.service.preview([track.id], {
                title: "After – 夜",
                genre: "Ambient",
                year: 2026,
            });

            assert.equal(preview.files[0].changes.length, 3);
            assert.deepEqual(
                await readFile(track.path),
                original,
                "Preview must not write the source",
            );

            const result = await f.service.save(preview.token);
            const after = await parseFile(track.path);

            assert.equal(result.updated, 1);
            assert.equal(after.common.title, "After – 夜");
            assert.equal(after.common.genre?.[0], "Ambient");
            assert.equal(after.common.year, 2026);
            assert.equal(after.common.artist, before.common.artist);
            assert.equal(after.common.track.no, 3);
            assert.deepEqual(after.common.comment, before.common.comment);
            assert.ok(before.common.picture?.length);
            assert.deepEqual(after.common.picture, before.common.picture);
            assert.equal(await f.audioHash(track.path), hash);
            assert.equal(f.repo.get(track.id)?.favorite, 1);
            assert.equal(f.repo.get(track.id)?.title, "After – 夜");
            assert.deepEqual(
                await readFile(
                    join(result.backupDirectory, track.id + "." + extension),
                ),
                original,
            );
            await assert.rejects(f.service.save(preview.token), /expired/);
        }
    }
    finally {
        await f.close();
    }
});

test("batch edits, unchanged previews, and clearing the year", async () => {
    const f = await fixture();

    try {
        const tracks = await Promise.all([f.create("mp3"), f.create("flac")]);
        const preview = await f.service.preview(
            tracks.map((track) => track.id),
            { album: "Shared album", year: 0 },
        );
        assert.equal(preview.files.length, 2);
        assert.equal((await f.service.save(preview.token)).updated, 2);

        for (const track of tracks) {
            assert.equal((await parseFile(track.path)).common.year, undefined);
            assert.equal(f.repo.get(track.id)?.album, "Shared album");
        }

        const unchanged = await f.service.preview([tracks[0].id], {
            album: "Shared album",
        });
        assert.equal(unchanged.files.length, 0);
    }
    finally {
        await f.close();
    }
});

test("stale previews and unsupported files cannot modify originals", async () => {
    const f = await fixture();

    try {
        const track = await f.create("mp3");
        const preview = await f.service.preview([track.id], {
            title: "Should not be saved",
        });
        await appendFile(track.path, Buffer.from([0]));
        const changed = await readFile(track.path);

        await assert.rejects(f.service.save(preview.token), /changed since/);
        assert.deepEqual(await readFile(track.path), changed);

        await f.index(join(f.root, "source.wav"));
        const wav = f.repo
            .snapshot()
            .tracks.find((item) => item.path.endsWith(".wav"))!;
        await assert.rejects(
            f.service.preview([wav.id], { title: "Unsupported" }),
            /supports MP3/,
        );
        assert.equal(tagPatchSchema.safeParse({ title: "" }).success, false);
        assert.equal(tagPatchSchema.safeParse({}).success, false);
        assert.equal(tagPatchSchema.safeParse({ year: -1 }).success, false);
    }
    finally {
        await f.close();
    }
});

test("a failure after replacement restores every source in a batch", async () => {
    const f = await fixture();

    try {
        const tracks = await Promise.all([f.create("mp3"), f.create("flac")]);
        const originals = await Promise.all(
            tracks.map((track) => readFile(track.path)),
        );
        let failed = false;
        const service = new TagService(
            {
                repo: f.repo,
                async index(path) {
                    if (!failed) {
                        failed = true;
                        throw new Error("Simulated index failure");
                    }
                    await f.index(path);
                },
            },
            join(f.root, "rollback-backups"),
        );

        const preview = await service.preview(
            tracks.map((track) => track.id),
            { artist: "New artist" },
        );
        await assert.rejects(
            service.save(preview.token),
            /Simulated index failure/,
        );

        for (const [index, track] of tracks.entries()) {
            assert.deepEqual(await readFile(track.path), originals[index]);
            assert.equal(f.repo.get(track.id)?.artist, "Test artist");
        }
    }
    finally {
        await f.close();
    }
});
