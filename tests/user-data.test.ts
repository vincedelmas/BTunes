import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {migrateLegacyUserData} from "../src/main/services/user-data.ts";

void test("renamed app preserves WAL data, artwork, and backups without overwriting a new library", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-user-data-"));
    const legacy = join(root, "legacy");
    const target = join(root, "BTunes");
    await mkdir(legacy);
    const original = new DatabaseSync(join(legacy, "library.sqlite"));

    try {
        original.exec("PRAGMA journal_mode=WAL; CREATE TABLE library(value TEXT); INSERT INTO library VALUES('favorite')");
        await mkdir(join(legacy, "covers"));
        await mkdir(join(legacy, "tag-backups"));
        await writeFile(join(legacy, "covers", "artwork"), "original artwork");
        await writeFile(join(legacy, "tag-backups", "original.mp3"), "original audio");

        assert.equal(await migrateLegacyUserData(legacy, target), true);
        const migrated = new DatabaseSync(join(target, "library.sqlite"));

        try {
            assert.equal(migrated.prepare("SELECT value FROM library").get()?.value, "favorite");
            migrated.exec("UPDATE library SET value='new favorite'");
        }
        finally {
            migrated.close();
        }

        assert.equal(await readFile(join(target, "covers", "artwork"), "utf8"), "original artwork");
        assert.equal(await readFile(join(target, "tag-backups", "original.mp3"), "utf8"), "original audio");
        assert.equal(original.prepare("SELECT value FROM library").get()?.value, "favorite");
        assert.equal(await migrateLegacyUserData(legacy, target), false);
        assert.equal(await migrateLegacyUserData(join(root, "missing"), join(root, "unused")), false);
    }
    finally {
        original.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("failed data migration leaves the legacy library and target artwork intact", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-user-data-"));
    const legacy = join(root, "legacy");
    const target = join(root, "BTunes");
    await mkdir(legacy);
    await mkdir(join(legacy, "covers"));
    await mkdir(join(target, "covers"), { recursive: true });
    await writeFile(join(target, "covers", "existing"), "keep");
    const database = new DatabaseSync(join(legacy, "library.sqlite"));
    database.exec("CREATE TABLE library(value TEXT)");
    database.close();

    try {
        await assert.rejects(migrateLegacyUserData(legacy, target), /already exists/);
        await assert.rejects(readFile(join(target, "library.sqlite")), { code: "ENOENT" });
        assert.equal(await readFile(join(target, "covers", "existing"), "utf8"), "keep");
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
