export interface FileImportResult {
    paths: string[];
    skipped: number;
    imported: number;
    errors: { path: string; message: string }[];
}


export interface FileImportChoice {
    folder: string;
    operation: "copy" | "move";
}
