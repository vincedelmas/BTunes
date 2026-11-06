import type {ComponentProps} from "react";

type FilterSelectProps = Omit<ComponentProps<"select">, "onChange"> & {
    label: string;
    placeholder: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
};

export function FilterSelect({
                                 label,
                                 placeholder,
                                 options,
                                 onChange,
                                 ...props
                             }: FilterSelectProps) {
    return (
        <select
            aria-label={label}
            onChange={(event) => onChange(event.target.value)}
            {...props}
        >
            <option value="">{placeholder}</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
