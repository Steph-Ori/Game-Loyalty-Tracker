export type MajorEvent = {
    id: number;
    event_name: string;
    event_type: string;
    release_date: string;
    end_date: string | null;
    game_id: number | null;
    platform_notes: string | null;
    notes: string | null;
    short_window_days: number;
    standard_window_days: number;
    baseline_window_days: number;
};