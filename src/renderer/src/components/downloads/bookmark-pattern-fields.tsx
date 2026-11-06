import {useState} from "react";
import {compileBookmarkPattern} from "../../../../shared/bookmarks";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

interface BookmarkPatternFieldsProps {
    pattern: string;
    disabled: boolean;
    onChange: (pattern: string) => void;
}


export function BookmarkPatternFields({ pattern, disabled, onChange }: BookmarkPatternFieldsProps) {
    const [example, setExample] = useState("Daft Punk - One More Time");
    let artist = "";
    let title = "";
    let error = "";

    try {
        const fields = compileBookmarkPattern(pattern).exec(example)?.groups;
        artist = fields?.artist?.trim() || "";
        title = fields?.title?.trim() || "";
    }
    catch (cause) {
        error = cause instanceof Error ? cause.message : "Check your bookmark pattern.";
    }

    return (
        <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="download-pattern">Bookmark name pattern</FieldLabel>
                <Input
                    id="download-pattern"
                    disabled={disabled}
                    value={pattern}
                    aria-invalid={Boolean(error)}
                    onChange={(ev) => onChange(ev.target.value)}
                />
                <FieldDescription>Use {'{artist}'} and {'{title}'} to read names. Add {'{skip}'} for sections to ignore.</FieldDescription>
                {error && <p className="text-xs text-destructive">{error}</p>}
            </Field>
            <Field>
                <FieldLabel htmlFor="download-example">Try a bookmark name</FieldLabel>
                <Input
                    id="download-example"
                    disabled={disabled}
                    value={example}
                    onChange={(ev) => setExample(ev.target.value)}
                />
                <div
                    aria-live="polite"
                    className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground"
                >
                    {artist && title ? (
                        <>
                            <p
                                className="truncate"
                                title={artist}
                            >Artist <span className="ml-2 text-foreground">{artist}</span></p>
                            <p
                                className="truncate"
                                title={title}
                            >Title <span className="ml-2 text-foreground">{title}</span></p>
                        </>
                    ) : <p>Try a name that matches your pattern to see the result.</p>}
                </div>
            </Field>
        </FieldGroup>
    );
}
