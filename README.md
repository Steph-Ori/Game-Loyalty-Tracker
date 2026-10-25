# Game Loyalty Tracker

Game Loyalty Tracker is a project that collects Steam player-count data and compares player activity around major game releases, updates, beta tests, and seasonal events.

The main idea behind the project is to look at player loyalty and retention.

Instead of only asking:

> Did player counts go up?

the project also asks:

> Did players stay after the event was over?

The project compares player activity before, during, and after major events to help show whether an event caused a short-term spike or a more lasting increase in player engagement.

## Research Question

How do major game releases, updates, beta tests, and seasonal events affect player activity and player retention on Steam?

The project focuses on comparing:

- Pre-event player activity
- During-event player activity
- Post-event player activity
- Peak concurrent players
- Percentage change from baseline
- Post-event retention
- Longer-term player movement

## How the Project Works

The project uses the following data flow:

Steam API → Java Collector → Azure Container App Job → Supabase PostgreSQL → Next.js Frontend

The Java collector gathers Steam concurrent-player data.

The collector runs automatically through an Azure Container App Job and stores the results in Supabase.

The Next.js frontend reads the collected data and displays:

- Current player counts
- 24-hour player movement
- 7-day averages
- 7-day peaks
- Event comparisons
- Before, during, and after event analysis
- Player-history charts
- Event-impact comparisons

## Languages and Tools

### Backend / Data Collection

- Java
- Steam Web API
- PostgreSQL
- Supabase
- JDBC

### Cloud / Automation

- Microsoft Azure
- Azure Container Apps Jobs
- Docker
- Azure Container Registry

### Frontend

- Next.js
- React
- TypeScript
- Recharts

### Development Tools

- IntelliJ IDEA
- VS Code
- Git
- GitHub
- Supabase Dashboard

## Repository Structure

```text
Game Loyalty Tracker/
├── data/
│   ├── games_rows.csv
│   ├── major_events_rows.csv
│   ├── player_counts.csv
│   └── README.md
│
├── docker/
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── src/
│   ├── Database.java
│   ├── Game.java
│   └── Main.java
│
└── README.md
```

## Collected Data

The `data` folder contains exported project data collected and used during the analysis.

### `player_counts.csv`

Contains Steam concurrent-player measurements collected over time.

Fields include:

- Record ID
- Game ID
- Game name
- Player count
- Collection timestamp

The current export contains data collected from September 21, 2026 through October 25, 2026.

### `games_rows.csv`

Contains the list of games tracked by the project, including Steam App IDs, genres, tracking groups, and active tracking status.

### `major_events_rows.csv`

Contains major releases, updates, beta tests, and seasonal events used for event comparisons.

More information about the exported data is available in:

```text
data/README.md
```

## Event Analysis

The frontend compares player activity across event windows.

For each event, the project can analyze:

- Average players before the event
- Average players during the event
- Average players after the event
- Peak player count
- Event lift compared with baseline
- Post-event activity compared with baseline
- Player retention after the event

Some events may overlap, so the project avoids treating overlapping activity as clean retention data when another event may also be influencing the player count.

## Current Findings

Early analysis has shown that different events can have very different effects on player activity.

For example:

- ARC Raiders: Frozen Trail produced a very large increase in player activity compared with the pre-event baseline.
- The ARC Raiders PvE Beta did not create another large increase and was followed by lower activity.
- Battlefield 6 Season 5 showed a positive increase in player activity compared with its baseline.
- The Modern Warfare 4 release corresponded with a major increase in the broader Call of Duty Steam population.

These results support the main goal of the project: measuring not only whether players arrive for an event, but whether their activity continues afterward.

## Special Data Handling

Some Steam titles require special handling.

For example, Call of Duty: Modern Warfare 4 does not provide a reliable standalone Steam concurrent-player population through its individual App ID.

Because of this, the project analyzes Modern Warfare 4's release using the broader Call of Duty Steam population instead of treating the standalone App ID as an independent player population.

The analysis also ignores zero-value Steam API samples when they appear to be collection anomalies.

## Data Collection

The collector is designed to run automatically approximately every 30 minutes.

The cloud collector sends new player-count records to Supabase, allowing the project to continue collecting data without requiring the local computer to remain running.

## Running the Frontend

From the `frontend` folder:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

The frontend requires the appropriate Supabase environment variables in a local `.env.local` file.

Environment files containing credentials are excluded from this repository.

## Main Pages

### Dashboard

Displays:

- Games currently being tracked
- Current player counts
- Collector status
- Upcoming events

### Event Analysis

Allows individual events to be selected and compares player activity before, during, and after the event.

### Loyalty Comparisons

Compares several major events and games using:

- Event lift
- Retention
- 24-hour movement
- 7-day averages
- 7-day peaks
- Player trends

## Project Status

The project currently includes:

- Automated cloud data collection
- Supabase database storage
- Steam concurrent-player tracking
- Event definitions
- Event analysis
- Loyalty comparison metrics
- Historical player charts
- Public CSV exports for project review

**Additional improvements may be made to the collector and analysis system as the project continues.**