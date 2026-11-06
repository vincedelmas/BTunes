import {GenreInput} from "@/components/genre-input";
import {cn} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
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
    genres: string[];
    busy: boolean;
    batch: boolean;
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
                        <div
                            className="tag-field-label flex h-[22px] items-center justify-between">
                            <FieldLabel
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                                htmlFor={"tag-" + field}
                            >
                                <Icon className="size-[14px] text-muted-foreground"/>
                                {tagLabels[field]}
                            </FieldLabel>
                            {batch ?
                                <Checkbox
                                    aria-label={"Apply " + tagLabels[field]}
                                    checked={changed}
                                    disabled={busy}
                                    onCheckedChange={(checked) => onToggle(field, Boolean(checked))}
                                />
                                :
                                changed &&
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={"Reset " + tagLabels[field]}
                                    disabled={busy}
                                    onClick={() => onReset(field)}
                                >
                                    <RotateCcw/>
                                </Button>
                            }
                        </div>
                        {field === "genre" ? <GenreInput
                            id="tag-genre"
                            value={values.genre}
                            genres={genres}
                            disabled={busy}
                            placeholder={batch ? "Mixed values" : "Choose or add a genre"}
                            onChange={(value) => onChange("genre", value)}
                        /> : (
                            <Input
                                id={"tag-" + field}
                                type={field === "year" ? "number" : "text"}
                                min={field === "year" ? 0 : undefined}
                                max={field === "year" ? 9999 : undefined}
                                value={values[field]}
                                placeholder={batch ? "Mixed values" : "Not set"}
                                disabled={busy}
                                onChange={(ev) => onChange(field, ev.target.value)}
                            />
                        )}
                    </Field>
                );
            })}
        </FieldGroup>
    );
}
