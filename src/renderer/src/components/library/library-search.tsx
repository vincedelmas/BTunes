import {useEffect, useId, useRef, useState} from "react";
import {Search, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {cn} from "@/lib/utils";


interface LibrarySearchProps {
    scope: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    onClear: () => void;
}


export function LibrarySearch({ scope, value, placeholder = "Search this page", onChange, onClear }: LibrarySearchProps) {
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const [openScope, setOpenScope] = useState<string>();
    const expanded = openScope === scope || Boolean(value);

    useEffect(() => {
        function focusSearch(ev: KeyboardEvent) {
            if ((!ev.ctrlKey && !ev.metaKey) || ev.altKey || ev.key.toLowerCase() !== "f") return;
            if (document.querySelector('[data-slot="dialog-content"]')) return;

            ev.preventDefault();
            setOpenScope(scope);
            input.current?.focus();
            input.current?.select();
        }

        document.addEventListener("keydown", focusSearch);
        return () => document.removeEventListener("keydown", focusSearch);
    }, [scope]);

    useEffect(() => {
        if (!expanded) return;
        input.current?.focus();
        input.current?.select();
    }, [expanded, scope]);

    function closeSearch() {
        onClear();
        setOpenScope(undefined);
        trigger.current?.focus();
    }

    return (
        <div className="header-search flex shrink-0 items-center">
            <Button
                ref={trigger}
                variant="ghost"
                size="icon-lg"
                className="rounded-full"
                aria-label={expanded ? "Close search" : "Open search"}
                aria-expanded={expanded}
                aria-controls={id}
                title="Search this page (Ctrl+F)"
                onClick={() => expanded ? closeSearch() : setOpenScope(scope)}
            >
                <Search/>
            </Button>
            <div
                id={id}
                aria-hidden={!expanded}
                inert={!expanded}
                className={cn("overflow-hidden transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none", expanded ? "w-[clamp(180px,24vw,280px)] opacity-100" : "w-0 opacity-0")}
            >
                <InputGroup className="search ml-2 h-9 w-[calc(100%-0.5rem)] rounded-full bg-control">
                    <InputGroupInput
                        ref={input}
                        value={value}
                        aria-label="Search your library"
                        placeholder={placeholder}
                        onChange={(ev) => {
                            setOpenScope(scope);
                            onChange(ev.target.value);
                        }}
                        onKeyDown={(ev) => {
                            if (ev.key !== "Escape") return;
                            ev.preventDefault();
                            ev.stopPropagation();
                            closeSearch();
                        }}
                    />
                    {value && <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            aria-label="Clear search"
                            title="Clear search"
                            onClick={() => {
                                setOpenScope(scope);
                                onClear();
                                input.current?.focus();
                            }}
                        >
                            <X aria-hidden="true"/>
                        </InputGroupButton>
                    </InputGroupAddon>}
                </InputGroup>
            </div>
        </div>
    );
}
