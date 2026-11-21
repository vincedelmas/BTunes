import type {Rpc} from "../../../shared/types/rpc";


export const rpc: Rpc = async (method, input) => {
    try {
        return await window.btunes.rpc(method, input);
    }
    catch (error) {
        const prefix = "Error invoking remote method 'rpc': Error: ";
        if (error instanceof Error && error.message.startsWith(prefix)) {
            throw new Error(error.message.slice(prefix.length), { cause: error });
        }

        throw error;
    }
};
