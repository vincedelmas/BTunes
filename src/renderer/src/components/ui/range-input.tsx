import {cn} from "@/lib/utils";
import type {ComponentProps, CSSProperties} from "react";


interface RangeInputProps extends Omit<ComponentProps<"input">, "type" | "value"> {
    value: number;
}


export function RangeInput({ min = 0, max = 100, value, style, className, ...props }: RangeInputProps) {
    const fraction = (Number(value ?? min) - Number(min)) / (Number(max) - Number(min));
    const progress = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) * 100 : 0;

    return (
        <input
            {...props}
            min={min}
            max={max}
            type="range"
            value={value}
            style={{ ...style, "--range-fill": progress + "%" } as CSSProperties}
            className={cn("h-4 cursor-pointer disabled:cursor-default", className)}
        />
    );
}
