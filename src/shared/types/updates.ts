export interface UpdateState {
    version: string;
    enabled: boolean;
    status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "up-to-date" | "error";
    availableVersion?: string;
    progress?: number;
    error?: string;
    lastCheckedAt?: number;
    showPrompt: boolean;
}
