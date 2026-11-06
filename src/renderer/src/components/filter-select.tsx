import {cn} from "@/lib/utils";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList} from "@/components/ui/combobox";


interface FilterSelectProps {
    id?: string;
    className?: string;
    label: string;
    value: string;
    disabled?: boolean;
    placeholder: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}


export function FilterSelect({ className, id, label, placeholder, options, value, disabled, onChange }: FilterSelectProps) {
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
                    className={cn("filter-combobox min-w-[155px] max-w-65 h-[38px] rounded-[9px] text-xs", className)}
                />
                <ComboboxContent
                    className="filter-popup min-w-55 p-[6px] border border-[#3a3a3a] rounded-xl bg-[#202020] shadow-[0_12px_45px_#0009] [&_[data-slot=select-item]]:min-h-9 [&_[data-slot=select-item]]:py-[9px] [&_[data-slot=select-item]]:rounded-[6px] [&_[data-slot=combobox-item]]:min-h-9 [&_[data-slot=combobox-item]]:py-[9px] [&_[data-slot=combobox-item]]:rounded-[6px]">
                    <ComboboxEmpty>
                        No matches found.
                    </ComboboxEmpty>
                    <ComboboxList>
                        {(item: { value: string; label: string }) =>
                            <ComboboxItem
                                key={item.value}
                                value={item}
                            >
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
            <SelectTrigger
                id={id}
                aria-label={label}
                className={cn("filter-trigger min-w-[155px] max-w-65 h-[38px] rounded-[9px] text-xs", className)}
            >
                <SelectValue/>
            </SelectTrigger>
            <SelectContent
                className="filter-popup min-w-55 p-[6px] border border-[#3a3a3a] rounded-xl bg-[#202020] shadow-[0_12px_45px_#0009] [&_[data-slot=select-item]]:min-h-9 [&_[data-slot=select-item]]:py-[9px] [&_[data-slot=select-item]]:rounded-[6px] [&_[data-slot=combobox-item]]:min-h-9 [&_[data-slot=combobox-item]]:py-[9px] [&_[data-slot=combobox-item]]:rounded-[6px]"
                align="start"
                alignItemWithTrigger={false}
            >
                <SelectGroup>
                    {items.map((item) =>
                        <SelectItem
                            key={item.value}
                            value={item.value}
                        >
                            {item.label}
                        </SelectItem>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
