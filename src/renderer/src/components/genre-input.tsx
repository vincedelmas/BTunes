import {resolveGenre} from "../../../shared/genres";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList} from "@/components/ui/combobox";

interface GenreInputProps {
    id: string;
    value: string;
    genres: string[];
    disabled: boolean;
    placeholder: string;
    onChange: (value: string) => void;
}


export function GenreInput({ id, value, genres, disabled, placeholder, onChange }: GenreInputProps) {
    const selected = genres.find((genre) => genre === resolveGenre(value, genres)) ?? null;

    return (
        <Combobox
            items={genres}
            value={selected}
            inputValue={value}
            disabled={disabled}
            autoComplete="off"
            openOnInputClick
            onInputValueChange={(next, details) => {
                if (details.reason === "input-change" || details.reason === "input-clear") onChange(next);
            }}
            onValueChange={(next) => {
                if (next) onChange(next);
            }}
        >
            <ComboboxInput
                disabled={disabled}
                id={id}
                placeholder={placeholder}
                className="h-[42px] w-full border-border bg-background"
                onBlur={() => {
                    const resolved = resolveGenre(value, genres);
                    if (resolved !== value) onChange(resolved);
                }}
            />
            <ComboboxContent>
                <ComboboxEmpty>No matching genre. Keep typing to add a new one.</ComboboxEmpty>
                <ComboboxList>
                    {(genre: string) => <ComboboxItem
                        key={genre}
                        value={genre}
                    >{genre}</ComboboxItem>}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
