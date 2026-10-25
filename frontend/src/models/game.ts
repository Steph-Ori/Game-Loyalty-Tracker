export type Game = {
    id: number;
    game_name: string;
    steam_app_id: string | null;
    genre: string | null;
    active: boolean;
    tracking_group: string | null;
}