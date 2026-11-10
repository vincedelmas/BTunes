import {useEffect, useRef} from "react";
import {Search, X} from "lucide-react";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";

interface LibrarySearchProps {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
    onClear: () => void;
}


export function LibrarySearch({ value, placeholder = "Search this page", disabled = false, onChange, onClear }: LibrarySearchProps) {
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function focusSearch(ev: KeyboardEvent) {
            if ((!ev.ctrlKey && !ev.metaKey) || ev.altKey || ev.key.toLowerCase() !== "f") return;
            if (document.querySelector('[data-slot="dialog-content"]')) return;

            ev.preventDefault();
            input.current?.focus();
            input.current?.select();
        }

        document.addEventListener("keydown", focusSearch);
        return () => document.removeEventListener("keydown", focusSearch);
    }, []);

    function clearSearch() {
        onClear();
        input.current?.focus();
    }

    return (
        <InputGroup
            className="search m-0 h-9 w-full gap-2 rounded-lg border-input bg-control px-2.5 text-foreground focus-within:border-primary has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupInput
                ref={input}
                className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                value={value}
                aria-label="Search your library"
                title="Search this page (Ctrl+F)"
                placeholder={placeholder}
                disabled={disabled}
                onChange={(ev) => onChange(ev.target.value)}
            />
            <InputGroupAddon className="p-0">
                <Search
                    aria-hidden="true"
                />
            </InputGroupAddon>
            {value && (
                <InputGroupAddon
                    align="inline-end"
                    className="p-0"
                >
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
