export interface FileImportResult {
    imported: number;
    paths: string[];
    skipped: number;
    errors: { path: string; message: string }[];
}

export interface FileImportChoice {
    folder: string;
    operation: "copy" | "move";
}
