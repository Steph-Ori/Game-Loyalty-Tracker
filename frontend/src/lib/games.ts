import { supabase } from "./supabase";
import type { Game } from "@/models/game";

export async function getGames(): Promise<Game[]> {
    const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("game_name", { ascending: true });

    if (error) {
        console.error("Error loading games:", error);
        return [];
    }

    return data ?? [];
}