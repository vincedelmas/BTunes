import type {UpdateState} from "../../../shared/types/updates";

export interface AppUpdateController {
    state?: UpdateState;
    pending: boolean;
    error: string;
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    dismiss: () => Promise<void>;
}
