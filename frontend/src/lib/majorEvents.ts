import { supabase } from "./supabase";
import type { MajorEvent } from "@/models/majorEvent";

export async function getMajorEvents(): Promise<MajorEvent[]> {
    const { data, error } = await supabase
        .from("major_events")
        .select("*")
        .order("release_date", { ascending: true });

    if (error) {
        console.error("Error loading major events:", error);
        return [];
    }

    return data ?? [];
}