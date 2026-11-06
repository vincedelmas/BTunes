export interface FileImportResult {
    imported: number;
    skipped: number;
    errors: { path: string; message: string }[];
}

export interface FileImportChoice {
    folder: string;
    operation: "copy" | "move";
}
