export function genreKey(value: string) {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function genreChoices(values: Iterable<string>) {
    const groups = new Map<string, Map<string, number>>();

    for (const value of values) {
        const label = value.trim().replace(/\s+/g, " ");
        const key = genreKey(label);
        if (!key || key === "uncategorized") continue;

        const spellings = groups.get(key) ?? new Map<string, number>();
        spellings.set(label, (spellings.get(label) ?? 0) + 1);
        groups.set(key, spellings);
    }

    return [...groups.values()]
        .map((spellings) => [...spellings].sort((first, second) => second[1] - first[1])[0][0])
        .sort((first, second) => first.localeCompare(second, "en", { sensitivity: "base" }));
}

export function resolveGenre(value: string, choices: string[]) {
    const key = genreKey(value);
    return choices.find((choice) => genreKey(choice) === key) ?? value.trim().replace(/\s+/g, " ");
}
