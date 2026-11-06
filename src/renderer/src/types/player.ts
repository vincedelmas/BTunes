import type {usePlayer} from "@/hooks/use-player";


export type RepeatMode = "off" | "all" | "one";

export type PlayerState = ReturnType<typeof usePlayer>;
