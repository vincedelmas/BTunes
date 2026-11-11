export interface UpdateState {
    error?: string;
    version: string;
    enabled: boolean;
    progress?: number;
    showPrompt: boolean;
    lastCheckedAt?: number;
    availableVersion?: string;
    status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "up-to-date" | "error";
}
