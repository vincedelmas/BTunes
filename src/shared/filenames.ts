export function safeFilename(value: string, fallback = "Song") {
    let name = value.split("").filter((character) => character.charCodeAt(0) >= 32).join("").replace(/[<>:"/\\|?*]/g, "_").trim();
    const characters = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name), (part) => part.segment);
    while (new TextEncoder().encode(characters.join("")).length > 200) characters.pop();
    name = characters.join("").replace(/[. ]+$/, "");
    return name || fallback;
}
