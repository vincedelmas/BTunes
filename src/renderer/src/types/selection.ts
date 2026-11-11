export interface SelectionModifiers {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

export interface SelectionRectangle {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface GridSelection {
    keys: string[];
    onChange: (keys: string[]) => void;
}

export interface GridGeometry {
    width: number;
    columns: number;
    rowHeight: number;
}
