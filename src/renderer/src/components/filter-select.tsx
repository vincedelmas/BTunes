import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList} from "@/components/ui/combobox";


interface FilterSelectProps {
    id?: string;
    label: string;
    value: string;
    disabled?: boolean;
    placeholder: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}


export function FilterSelect({ id, label, placeholder, options, value, disabled, onChange }: FilterSelectProps) {
    const items = [{ value: "", label: placeholder }, ...options];

    if (options.length > 15) {
        const selected = items.find((item) => item.value === value) ?? null;

        return (
            <Combobox
                items={items}
                value={selected}
                disabled={disabled}
                openOnInputClick={true}
                itemToStringLabel={(item) => item.label}
                itemToStringValue={(item) => item.value}
                onValueChange={(item) => onChange(item?.value ?? "")}
            >
                <ComboboxInput
                    id={id}
                    aria-label={label}
                    placeholder={placeholder}
                    showClear={Boolean(value)}
                    className="filter-combobox"
                />
                <ComboboxContent className="filter-popup">
                    <ComboboxEmpty>
                        No matches found.
                    </ComboboxEmpty>
                    <ComboboxList>
                        {(item: { value: string; label: string }) =>
                            <ComboboxItem key={item.value} value={item}>
                                {item.label}
                            </ComboboxItem>
                        }
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        );
    }

    return (
        <Select
            items={items}
            value={value}
            disabled={disabled}
            onValueChange={(next) => onChange(next ?? "")}
        >
            <SelectTrigger id={id} aria-label={label} className="filter-trigger">
                <SelectValue/>
            </SelectTrigger>
            <SelectContent className="filter-popup" align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                    {items.map((item) =>
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
