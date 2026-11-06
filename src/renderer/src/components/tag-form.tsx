import {CalendarDays, Disc3, Music2, RotateCcw, Tag, UserRound} from "lucide-react";
import {tagFields, tagLabels, type TagPatch} from "../../../shared/tags";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

const fieldIcons = { title: Music2, artist: UserRound, album: Disc3, genre: Tag, year: CalendarDays };

export function TagForm({ values, enabled, batch, busy, onChange, onToggle, onReset }: {
    values: Record<keyof TagPatch, string>;
    enabled: Set<keyof TagPatch>;
    batch: boolean;
    busy: boolean;
    onChange: (field: keyof TagPatch, value: string) => void;
    onToggle: (field: keyof TagPatch, checked: boolean) => void;
    onReset: (field: keyof TagPatch) => void;
}) {
    return (
        <FieldGroup className="tag-fields">
            {tagFields.map((field) => {
                const Icon = fieldIcons[field];
                const changed = enabled.has(field);

                return (
                    <Field key={field} className={cn("tag-field", changed && "tag-field-changed")}>
                        <div className="tag-field-label">
                            <FieldLabel htmlFor={"tag-" + field}><Icon/>{tagLabels[field]}</FieldLabel>
                            {batch ? (
                                <Checkbox aria-label={"Apply " + tagLabels[field]} checked={changed} disabled={busy}
                                          onCheckedChange={(checked) => onToggle(field, Boolean(checked))}/>
                            ) : changed && (
                                <Button variant="ghost" size="icon-xs" aria-label={"Reset " + tagLabels[field]} disabled={busy} onClick={() => onReset(field)}><RotateCcw/></Button>
                            )}
                        </div>
                        <Input id={"tag-" + field} type={field === "year" ? "number" : "text"}
                               min={field === "year" ? 0 : undefined} max={field === "year" ? 9999 : undefined}
                               value={values[field]} placeholder={batch ? "Mixed values" : "Not set"}
                               disabled={busy} onChange={(ev) => onChange(field, ev.target.value)}/>
                    </Field>
                );
            })}
        </FieldGroup>
    );
}
