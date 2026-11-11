import {useState} from "react";
import {Input} from "@/components/ui/input";
import {compileBookmarkPattern} from "../../../../shared/bookmarks";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";


interface BookmarkPatternFieldsProps {
    pattern: string;
    disabled: boolean;
    onChange: (pattern: string) => void;
}


export function BookmarkPatternFields({ pattern, disabled, onChange }: BookmarkPatternFieldsProps) {
    const [example, setExample] = useState("Daft Punk - One More Time");

    let title = "";
    let error = "";
    let artist = "";

    try {
        const fields = compileBookmarkPattern(pattern).exec(example)?.groups;
        title = fields?.title?.trim() || "";
        artist = fields?.artist?.trim() || "";
    }
    catch (cause) {
        error = cause instanceof Error
            ? cause.message
            : "Check your bookmark pattern.";
    }

    return (
        <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="download-pattern">
                    Bookmark name pattern
                </FieldLabel>
                <Input
                    value={pattern}
                    disabled={disabled}
                    id="download-pattern"
                    aria-invalid={Boolean(error)}
                    onChange={(ev) => onChange(ev.target.value)}
                />
                <FieldDescription>
                    Use
                    {" "}
                    {'{artist}'}
                    {" "}
                    and
                    {" "}
                    {'{title}'}
                    {" "}
                    to read names. Add
                    {" "}
                    {'{skip}'}
                    {" "}
                    for sections to ignore.
                </FieldDescription>
                {error &&
                    <p className="text-xs text-destructive">
                        {error}
                    </p>
                }
            </Field>
            <Field>
                <FieldLabel htmlFor="download-example">
                    Try a bookmark name
                </FieldLabel>
                <Input
                    value={example}
                    disabled={disabled}
                    id="download-example"
                    onChange={(ev) => setExample(ev.target.value)}
                />
                <div aria-live="polite" className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                    {artist && title ?
                        <>
                            <p title={artist} className="truncate">
                                Artist
                                {" "}
                                <span className="ml-2 text-foreground">
                                    {artist}
                                </span>
                            </p>
                            <p title={title} className="truncate">
                                Title
                                {" "}
                                <span className="ml-2 text-foreground">
                                    {title}
                                </span>
                            </p>
                        </>
                        :
                        <p>Try a name that matches your pattern to see the result.</p>
                    }
                </div>
            </Field>
        </FieldGroup>
    );
}
