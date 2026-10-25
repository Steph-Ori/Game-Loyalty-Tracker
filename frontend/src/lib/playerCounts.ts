import { supabase } from "./supabase";
import type { PlayerCount } from "@/models/playerCount";

export async function getPlayerCountsByGame(
    gameId: number,
    startDate: string,
    endDate: string
): Promise<PlayerCount[]> {
    const { data, error } = await supabase
        .from("player_counts")
        .select("*")
        .eq("game_id", gameId)
        .gte("collected_at", startDate)
        .lte("collected_at", endDate)
        .order("collected_at", { ascending: true });

    if (error) {
        console.error("Error loading player counts:", error);
        return [];
    }

    return data ?? [];
}

