export interface SelectionModifiers {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

export interface SelectionRectangle {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface GridSelection {
    keys: string[];
    onChange: (keys: string[]) => void;
}

export interface GridGeometry {
    columns: number;
    rowHeight: number;
    width: number;
}
