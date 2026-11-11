import type {UpdateState} from "../../../shared/types/updates";

export interface AppUpdateController {
    error: string;
    pending: boolean;
    state?: UpdateState;
    check: () => Promise<void>;
    install: () => Promise<void>;
    dismiss: () => Promise<void>;
    download: () => Promise<void>;
}
