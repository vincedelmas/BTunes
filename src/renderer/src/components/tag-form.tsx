import {cn} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {GenreInput} from "@/components/genre-input";
import type {TagPatch} from "../../../shared/types/tags";
import {tagFields, tagLabels} from "../../../shared/tags";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {CalendarDays, Disc3, Music2, RotateCcw, Tag, UserRound} from "lucide-react";


const fieldIcons = {
    genre: Tag,
    album: Disc3,
    title: Music2,
    artist: UserRound,
    albumArtist: UserRound,
    year: CalendarDays,
};


interface TagFormProps {
    busy: boolean;
    batch: boolean;
    genres: string[];
    enabled: Set<keyof TagPatch>;
    values: Record<keyof TagPatch, string>;
    onReset: (field: keyof TagPatch) => void;
    onChange: (field: keyof TagPatch, value: string) => void;
    onToggle: (field: keyof TagPatch, checked: boolean) => void;
}


export function TagForm({ genres, values, enabled, batch, busy, onChange, onToggle, onReset }: TagFormProps) {
    return (
        <FieldGroup className="tag-fields grid grid-cols-2 gap-5">
            {tagFields.map((field) => {
                const Icon = fieldIcons[field];
                const changed = enabled.has(field);

                return (
                    <Field
                        key={field}
                        className={cn("tag-field gap-[9px] [&_input]:h-[42px] [&_input]:px-3 [&_input]:text-[13px]", field === "title" && "col-span-full", changed && "tag-field-changed [&_input]:border-primary/40 [&_[data-slot=input-group]]:border-primary/40")}
                    >
                        <div className="tag-field-label flex h-[22px] items-center justify-between">
                            <FieldLabel
                                htmlFor={"tag-" + field}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                                <Icon className="size-[14px] text-muted-foreground"/>
                                {tagLabels[field]}
                            </FieldLabel>
                            {batch ? (
                                <Checkbox
                                    disabled={busy}
                                    checked={changed}
                                    aria-label={"Apply " + tagLabels[field]}
                                    onCheckedChange={(checked) => onToggle(field, Boolean(checked))}
                                />
                            ) : changed &&
                            (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => onReset(field)}
                                    aria-label={"Reset " + tagLabels[field]}
                                >
                                    <RotateCcw/>
                                </Button>
                            )}
                        </div>
                        {field === "genre" ? (
                            <GenreInput
                                id="tag-genre"
                                genres={genres}
                                disabled={busy}
                                value={values.genre}
                                onChange={(value) => onChange("genre", value)}
                                placeholder={batch ? "Mixed values" : "Choose or add a genre"}
                            />
                        ) : (
                            <Input
                                disabled={busy}
                                id={"tag-" + field}
                                value={values[field]}
                                min={field === "year" ? 0 : undefined}
                                max={field === "year" ? 9999 : undefined}
                                type={field === "year" ? "number" : "text"}
                                placeholder={batch ? "Mixed values" : "Not set"}
                                onChange={(ev) => onChange(field, ev.target.value)}
                            />
                        )}
                    </Field>
                );
            })}
        </FieldGroup>
    );
}
