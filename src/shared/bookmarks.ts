export function compileBookmarkPattern(pattern: string) {
    const counts = { artist: 0, title: 0 };
    const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let expression = "^\\s*";
    let previousCapture = false;
    for (const part of pattern.match(/\{[^{}]*\}|[^{}]+|[{}]/g) ?? []) {
        if (part === "{" || part === "}") throw new Error("Close each brace in the name pattern.");
        const token = part.startsWith("{") ? part.slice(1, -1) : undefined;
        const capture = token === "artist" || token === "title" || token === "skip";
        if (capture && previousCapture) throw new Error("Put a separator between name fields.");
        if (token === "artist" || token === "title") {
            counts[token]++;
            expression += "(?<" + token + ">.+?)";
        }
        else if (token === "skip") expression += ".+?";
        else expression += escape(token ?? part);
        previousCapture = capture;
    }
    if (counts.artist !== 1 || counts.title !== 1) throw new Error("Include {artist} and {title} once each.");
    return new RegExp(expression + "\\s*$", "u");
}

export function youtubeVideoId(address: string) {
    const url = new URL(address);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use a YouTube video link.");
    const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    if (host === "youtube.com") {
        id = url.searchParams.get("v");
        if (/^\/(shorts|embed)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error("Use a YouTube video link.");
    return id;
}
