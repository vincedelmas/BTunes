import {useRef} from "react";
import {Search, X} from "lucide-react";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";

interface LibrarySearchProps {
    value: string;
    onChange: (value: string) => void;
}

export function LibrarySearch({ value, onChange }: LibrarySearchProps) {
    const input = useRef<HTMLInputElement>(null);

    function clearSearch() {
        onChange("");
        input.current?.focus();
    }

    return (
        <InputGroup className="search">
            <InputGroupInput
                ref={input}
                value={value}
                aria-label="Search your library"
                placeholder="Search songs, artists, albums"
                onChange={(ev) => onChange(ev.target.value)}
            />
            <InputGroupAddon className="p-0">
                <Search size={21} aria-hidden="true"/>
            </InputGroupAddon>
            {value && (
                <InputGroupAddon align="inline-end" className="p-0">
                    <InputGroupButton
                        size="icon-xs"
                        aria-label="Clear search"
                        title="Clear search"
                        onClick={clearSearch}
                    >
                        <X aria-hidden="true"/>
                    </InputGroupButton>
                </InputGroupAddon>
            )}
        </InputGroup>
    );
}
