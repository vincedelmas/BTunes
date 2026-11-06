import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, mkdir, writeFile, copyFile, readFile, rm} from "node:fs/promises";
import {execFile, execFileSync} from "node:child_process";
import {promisify} from "node:util";
import {setTimeout} from "node:timers/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {parseFile} from "music-metadata";
import {compileBookmarkPattern, youtubeVideoId} from "../src/shared/bookmarks.ts";
import {downloaderSettingsSchema} from "../src/shared/schemas/downloads.ts";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {DownloadRepository} from "../src/main/repositories/downloads.ts";
import {LibraryService} from "../src/main/services/library.ts";
import {DownloadMetadata} from "../src/main/services/download-metadata.ts";
import {DownloaderService} from "../src/main/services/downloads.ts";
import {ArtworkService} from "../src/main/services/artwork.ts";
import {scanBookmarks} from "../src/main/services/bookmarks.ts";
import {downloadProcess} from "../src/main/services/download-process.ts";
import type {DownloadRunner, DownloadToolProvider} from "../src/main/types/downloads.ts";

const execute = promisify(execFile);
const id = "BaW_jenozKc";

void test("bookmark patterns preserve artist punctuation and canonicalize duplicate YouTube links", async () => {
    assert.deepEqual({ ...compileBookmarkPattern("{artist} - {title}").exec("AC/DC - Thunderstruck")?.groups }, { artist: "AC/DC", title: "Thunderstruck" });
    assert.deepEqual({ ...compileBookmarkPattern("{skip}: {title} {-} {artist}").exec("Music: One More Time - Daft Punk")?.groups }, {
        artist: "Daft Punk",
        title: "One More Time"
    });
    assert.throws(() => compileBookmarkPattern("{artist}{title}"), /separator/);
    assert.throws(() => compileBookmarkPattern("{title} - {title}"), /once/);
    assert.equal(youtubeVideoId("https://youtu.be/" + id + "?t=1"), id);
    assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=" + id), id);
    assert.throws(() => youtubeVideoId("https://youtube.com.attacker.invalid/watch?v=" + id));
    assert.throws(() => youtubeVideoId("file:///tmp/video"));
});

void test("downloads remain staged until tags are reviewed, then publish once and retain the video archive", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-download-"));
    const music = join(root, "music");
    await mkdir(music);
    const bookmarks = join(root, "Bookmarks");
    await writeFile(bookmarks, JSON.stringify({
        roots: {
            bookmark_bar: {
                id: "1", type: "folder", name: "Bookmarks bar", children: [{
                    id: "2", type: "folder", name: "Music", children: [
                        { type: "url", name: "AC/DC - Thunderstruck", url: "https://youtu.be/" + id },
                        { type: "folder", id: "3", name: "Nested", children: [{ type: "url", name: "Duplicate", url: "https://www.youtube.com/watch?v=" + id }] },
                        { type: "url", name: "Wrong name", url: "https://youtu.be/abcdefghijk" },
                    ]
                }]
            }
        }
    }));
    const library = new LibraryService(new LibraryRepository(":memory:"), join(root, "covers"));
    const repo = new DownloadRepository(library.repo.db);
    const settings = downloaderSettingsSchema.parse({ bookmarksFile: bookmarks, folderId: "2", destination: music, fetchMetadata: false });
    repo.saveSettings(settings);
    const audio = join(root, "source.mp3");
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.5", audio]);
    let runs = 0;
    const tools: DownloadToolProvider = {
        acquire: async () => ({ ytDlp: "fixture-yt", ffmpeg: "ffmpeg", ffprobe: "ffprobe" }),
        check: async () => undefined,
        snapshot: () => ({ ready: true, checking: false, message: "Fixture tools", versions: {} }),
        close: async () => undefined,
    };
    const run: DownloadRunner = async (command, args, signal, onLine) => {
        if (command === "fixture-yt") {
            runs++;
            onLine?.("download:50%");
            await copyFile(audio, args[args.indexOf("--output") + 1].replace("%(ext)s", "mp3"));
        }
        else await execute(command, args, { signal });
    };
    let downloader = new DownloaderService(repo, library, new ArtworkService(), tools, join(root, "staging"), run);

    async function waitFor(predicate: () => boolean) {
        const end = Date.now() + 5000;
        while (!predicate()) {
            assert.ok(Date.now() < end, "Download did not settle");
            await setTimeout(10);
        }
    }

    try {
        await library.scan(music);
        const entries = await scanBookmarks(settings);
        assert.equal(entries.length, 2);
        assert.equal(entries.find(item => item.id !== id)?.status, "invalid");
        await downloader.enter();
        downloader.start([id, id]);
        await waitFor(() => !downloader.snapshot()!.busy);
        assert.equal(downloader.snapshot()!.items.find(item => item.id === id)?.status, "review");
        assert.equal(library.repo.snapshot().tracks.length, 0, "Unreviewed audio must stay out of the library");
        assert.equal(runs, 1, "Duplicate IDs must not download twice");
        await downloader.publish(id, { title: "Thunderstruck", artist: "AC/DC", albumArtist: "AC/DC", album: "The Razors Edge", genre: "Rock", year: 1990 });
        assert.equal(downloader.snapshot()!.items.find(item => item.id === id)?.status, "done");
        const track = library.repo.snapshot().tracks[0];
        assert.equal(track.album, "The Razors Edge");
        assert.equal((await parseFile(track.path)).common.year, 1990);
        assert.ok((await readFile(track.path)).length > 0);
        assert.equal(repo.history().get(id), track.path);
        await downloader.scan();
        assert.equal(downloader.snapshot()!.items.find(item => item.id === id)?.status, "done");
        assert.throws(() => downloader.start([id]), /available/);
        assert.throws(() => downloader.publish(id, {}), /Download the song/);
        await writeFile(bookmarks, JSON.stringify({
            roots: {
                bookmark_bar: {
                    id: "1",
                    type: "folder",
                    children: [{ id: "2", type: "folder", children: [{ type: "url", name: "AC/DC - Thunderstruck", url: "https://youtu.be/12345678901" }] }]
                }
            }
        }));
        await downloader.scan();
        assert.equal(downloader.snapshot()!.items[0].status, "done", "Existing library tags must prevent redownloading old bookmarks");
        assert.equal(repo.history().get("12345678901"), track.path);
    }
    finally {
        await downloader.close();
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("download process cancellation terminates the child process", async () => {
    const controller = new AbortController();
    const task = downloadProcess(process.execPath, ["-e", "setInterval(()=>{},1000)"], controller.signal);
    controller.abort();
    await assert.rejects(task, /cancelled/);
});

void test("downloader settings and completed video IDs persist when reopening the database", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-download-settings-"));
    const file = join(root, "library.sqlite");
    const settings = downloaderSettingsSchema.parse({
        bookmarksFile: "/browser/Bookmarks",
        folderId: "42",
        destination: "/music",
        namePattern: "{title} {-} {artist}",
        quality: "320k",
        concurrency: 2
    });
    let library = new LibraryRepository(file);
    try {
        let repo = new DownloadRepository(library.db);
        repo.saveSettings(settings);
        repo.complete(id, "/music/renamed.mp3");
        library.db.close();
        library = new LibraryRepository(file);
        repo = new DownloadRepository(library.db);
        assert.deepEqual(repo.settings(), settings);
        assert.equal(repo.history().get(id), "/music/renamed.mp3");
    }
    finally {
        library.db.close();
        await rm(root, { recursive: true, force: true });
    }
});

for (const missingRelease of [false, true]) {
    void test(`online metadata falls back when MusicBrainz ${missingRelease ? "has no album" : "is unavailable"}`, async () => {
        const metadata = new DownloadMetadata((async (input) => {
            const url = new URL(input instanceof Request ? input.url : input.toString());
            if (url.hostname === "musicbrainz.org") {
                if (!missingRelease) return new Response("Unavailable", { status: 503 });
                return Response.json({ recordings: [{ title: "One More Time", score: 100, "artist-credit": [{ name: "Daft Punk" }] }] });
            }
            assert.equal(url.hostname, "itunes.apple.com");
            return Response.json({
                results: [{ trackName: "Wrong song", artistName: "Daft Punk" }, {
                    trackName: "One More Time",
                    artistName: "Daft Punk",
                    collectionName: "Discovery",
                    primaryGenreName: "Dance",
                    releaseDate: "2001-01-01"
                }]
            });
        }) satisfies typeof fetch);
        const result = await metadata.lookup("Daft Punk", "One More Time", new AbortController().signal);
        assert.equal(result.album, "Discovery");
        assert.equal(result.genre, "Dance");
        assert.equal(result.year, 2001);
    });
}
