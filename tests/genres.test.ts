import {test} from "node:test";
import assert from "node:assert/strict";
import {genreChoices, genreKey, resolveGenre} from "../src/shared/genres.ts";

void test("genre choices collapse casing and whitespace while keeping the most common spelling", () => {
    const genres = genreChoices(["Pop", "pop", "Pop", "POp", " Synth   Pop ", "synth pop", "", "Uncategorized"]);
    assert.deepEqual(genres, ["Pop", "Synth Pop"]);
    assert.equal(resolveGenre(" pOP ", genres), "Pop");
    assert.equal(resolveGenre("sYnTh  pOp", genres), "Synth Pop");
    assert.equal(resolveGenre(" New   genre ", genres), "New genre");
    assert.equal(genreKey("ÉLECTRO"), genreKey("électro"));
});
