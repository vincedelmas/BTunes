import {test} from "node:test";
import {join} from "node:path";
import {tmpdir} from "node:os";
import assert from "node:assert/strict";
import {mkdtempSync, rmSync} from "node:fs";
import {LibraryRepository} from "../src/main/repositories/library.ts";

void test("library data and playlists survive reopening the database", () => {
    const root = mkdtempSync(join(tmpdir(), "btunes-persistence-"));
    const file = join(root, "library.sqlite");

    try {
        const first = new LibraryRepository(file);
        const id = first.create("Road trip");
        first.folder("/music");
        first.db.close();
        const reopened = new LibraryRepository(file);
        assert.equal(reopened.snapshot().playlists[0].id, id);
        assert.equal(reopened.snapshot().playlists[0].name, "Road trip");
        assert.deepEqual(reopened.snapshot().folders, ["/music"]);
        reopened.db.close();
    }
    finally {
        rmSync(root, { recursive: true, force: true });
    }
});
