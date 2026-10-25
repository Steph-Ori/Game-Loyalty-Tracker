# Game Loyalty Tracker Data (Title Pending)

This folder contains the data collected and used for the Game Loyalty Tracker project.

The project collects Steam player-count data and compares player activity around major game releases, updates, betas, and other events. The goal is to look at whether players only return temporarily for an event or whether activity remains higher afterward.

## Files

### `player_counts.csv`

This is the main collected dataset.

It contains Steam player-count measurements collected over time.

Columns include:

- `id` — unique record ID
- `game_id` — ID used to connect the record to a game
- `game_name` — name of the game
- `player_count` — Steam concurrent player count at the time of collection
- `collected_at` — timestamp showing when the data was collected

This export contains data collected from September 21, 2026 through October 25, 2026.

The collector runs automatically through an Azure Container App Job and stores the results in Supabase.

### `games_rows.csv`

This file contains the games being tracked by the project.

It includes information such as:

- Game ID
- Game name
- Steam App ID
- Genre
- Whether the game is currently active for tracking
- Tracking group
- Collection App ID when applicable

This file can be used to connect a `game_id` in the database to a specific game.

### `major_events_rows.csv`

This file contains the major gaming events being tracked for comparison.

Examples include:

- Game releases
- Major updates
- Beta tests
- Season launches
- Season phases

The event data includes dates and analysis-window information used to compare player activity before, during, and after an event.

## Project Data Flow

The main data flow for the project is:

Steam API → Java Collector → Azure Container App Job → Supabase PostgreSQL → Next.js Dashboard

Player counts are collected automatically and then analyzed by the frontend to compare changes in player activity and possible player loyalty around major events.

## Notes

Some games may be handled differently depending on how Steam reports player populations.

For example, Call of Duty: Modern Warfare 4 is analyzed using the broader Call of Duty Steam population because the standalone Steam App ID does not represent a reliable independent concurrent-player population.

Zero-value API samples that appear to be collection anomalies are ignored by the event-analysis calculations.