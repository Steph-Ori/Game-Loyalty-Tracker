import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Game = {
    id: number;
    game_name: string;
    genre: string | null;
    tracking_group: string | null;
};

type PlayerCount = {
    game_id: number;
    player_count: number;
    collected_at: string;
};

type CollectionLog = {
    status: string;
    logged_at: string;
};

type MajorEvent = {
    id: number;
    event_name: string;
    event_type: string;
    release_date: string;
    platform_notes: string | null;
    game_id: number | null;
};

export default async function Home() {

    // --------------------------------------------------
    // LOAD ACTIVE GAMES
    // --------------------------------------------------

    const { data: games, error: gamesError } = await supabase
        .from("games")
        .select(`
            id,
            game_name,
            genre,
            tracking_group
        `)
        .eq("active", true);


    // --------------------------------------------------
    // LOAD RECENT PLAYER COUNTS
    // --------------------------------------------------

    const { data: playerCounts, error: countsError } = await supabase
        .from("player_counts")
        .select(`
            game_id,
            player_count,
            collected_at
        `)
        .order("collected_at", { ascending: false })
        .limit(1000);


    // --------------------------------------------------
    // LOAD COLLECTION LOGS
    // --------------------------------------------------

    const { data: logs } = await supabase
        .from("collection_logs")
        .select(`
            status,
            logged_at
        `)
        .order("logged_at", { ascending: false })
        .limit(500);


    // --------------------------------------------------
    // LOAD MAJOR EVENTS
    // --------------------------------------------------

    const { data: events, error: eventsError } = await supabase
        .from("major_events")
        .select(`
            id,
            event_name,
            event_type,
            release_date,
            platform_notes,
            game_id
        `)
        .order("release_date", { ascending: true });


    // --------------------------------------------------
    // ERROR HANDLING
    // --------------------------------------------------

    if (gamesError || countsError || eventsError) {

        return (

            <main className="min-h-screen bg-black p-8 text-white">

                <h1 className="text-4xl font-bold">
                    Game Loyalty Tracker
                </h1>

                <p className="mt-4 text-red-500">
                    Could not load dashboard data.
                </p>

                <p className="mt-2 text-gray-400">
                    {gamesError?.message ||
                        countsError?.message ||
                        eventsError?.message}
                </p>

            </main>

        );

    }


    // --------------------------------------------------
    // CONVERT SUPABASE DATA TO TYPES
    // --------------------------------------------------

    const gameList = (games ?? []) as Game[];
    const countList = (playerCounts ?? []) as PlayerCount[];
    const logList = (logs ?? []) as CollectionLog[];
    const eventList = (events ?? []) as MajorEvent[];


    // --------------------------------------------------
    // FIND LATEST PLAYER COUNT FOR EACH GAME
    // --------------------------------------------------

    const latestCounts = new Map<number, PlayerCount>();

    for (const record of countList) {

        if (!latestCounts.has(record.game_id)) {

            latestCounts.set(
                record.game_id,
                record
            );

        }

    }


    // --------------------------------------------------
    // BUILD DASHBOARD GAME DATA
    // --------------------------------------------------

    const dashboardGames = gameList
        .map((game) => {

            const latest =
                latestCounts.get(game.id);

            return {

                ...game,

                player_count:
                    latest?.player_count ?? null,

                collected_at:
                    latest?.collected_at ?? null,

            };

        })
        .filter(
            (game) =>
                game.player_count !== null
        );


    // --------------------------------------------------
    // GROUP GAMES
    // --------------------------------------------------

    const groupedGames = {

        "Special Interest":
            dashboardGames.filter(
                (game) =>
                    game.tracking_group ===
                    "Special Interest"
            ),

        "Upcoming Release":
            dashboardGames.filter(
                (game) =>
                    game.tracking_group ===
                    "Upcoming Release"
            ),

        "Top Steam":
            dashboardGames.filter(
                (game) =>
                    game.tracking_group ===
                    "Top Steam"
            ),

    };


    // --------------------------------------------------
    // FIND MOST RECENT COLLECTION TIME
    // --------------------------------------------------

    const latestCollection =
        dashboardGames
            .map(
                (game) =>
                    game.collected_at
            )
            .filter(Boolean)
            .sort()
            .at(-1) ?? null;


    // --------------------------------------------------
    // COLLECTOR HEALTH
    // --------------------------------------------------

    const today =
        new Date().toDateString();

    const failedToday =
        logList.filter(
            (log) => {

                return (
                    log.status === "FAILED" &&
                    new Date(
                        log.logged_at
                    ).toDateString() === today
                );

            }
        ).length;

    const collectorHealthy =
        failedToday === 0;


    // --------------------------------------------------
    // UPCOMING EVENTS
    // --------------------------------------------------

    const todayDate =
        new Date();

    const upcomingEvents =
        eventList.filter(
            (event) => {

                const eventDate =
                    new Date(
                        `${event.release_date}T23:59:59`
                    );

                return (
                    eventDate >= todayDate
                );

            }
        );


    // --------------------------------------------------
    // PAGE
    // --------------------------------------------------

    return (

        <main className="min-h-screen bg-black px-6 py-8 text-white">

            <div className="mx-auto max-w-7xl">


                {/* HEADER */}

                <div>

                    <h1 className="text-4xl font-bold">
                        Game Loyalty Tracker
                    </h1>

                    <p className="mt-2 text-gray-400">
                        Tracking Steam player activity around major game releases
                    </p>


                    {/* NAVIGATION BUTTONS */}

                    <div className="mt-5 flex flex-wrap gap-3">

                        <Link
                            href="/comparisons"
                            className="rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:bg-gray-900 hover:text-white"
                        >
                            Loyalty Comparisons
                        </Link>

                        <Link
                            href="/events"
                            className="rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:bg-gray-900 hover:text-white"
                        >
                            Event Analysis
                        </Link>

                    </div>

                </div>


                {/* SUMMARY CARDS */}

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <SummaryCard
                        title="Games Tracked"
                        value={
                            dashboardGames.length.toString()
                        }
                    />

                    <SummaryCard
                        title="Collector Status"
                        value={
                            collectorHealthy
                                ? "Healthy"
                                : "Check Logs"
                        }
                    />

                    <SummaryCard
                        title="Failed Today"
                        value={
                            failedToday.toString()
                        }
                    />

                    <SummaryCard
                        title="Last Collection"
                        value={
                            latestCollection
                                ? new Date(
                                    latestCollection
                                ).toLocaleTimeString()
                                : "No data"
                        }
                    />

                </div>


                {/* UPCOMING EVENTS */}

                <section className="mt-12">

                    <div className="mb-5">

                        <h2 className="text-2xl font-bold">
                            Upcoming Major Events
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Releases and updates being tracked for player activity changes
                        </p>

                    </div>


                    {upcomingEvents.length === 0 ? (

                        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">

                            <p className="text-gray-400">
                                No upcoming major events are currently listed.
                            </p>

                        </div>

                    ) : (

                        <div className="grid gap-4 md:grid-cols-2">

                            {upcomingEvents.map(
                                (event) => (

                                    <EventCard
                                        key={event.id}
                                        event={event}
                                    />

                                )
                            )}

                        </div>

                    )}

                </section>


                {/* GAME GROUPS */}

                {Object.entries(
                    groupedGames
                ).map(
                    ([
                         groupName,
                         groupGames
                     ]) => {

                        if (
                            groupGames.length === 0
                        ) {
                            return null;
                        }

                        return (

                            <section
                                key={groupName}
                                className="mt-12"
                            >

                                <div className="mb-5 flex items-end justify-between">

                                    <div>

                                        <h2 className="text-2xl font-bold">
                                            {groupName}
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {groupGames.length} games
                                        </p>

                                    </div>

                                </div>


                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                                    {groupGames.map(
                                        (game) => (

                                            <GameCard
                                                key={game.id}
                                                game={game}
                                            />

                                        )
                                    )}

                                </div>

                            </section>

                        );

                    }
                )}


            </div>

        </main>

    );

}


// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({
                         title,
                         value,
                     }: {
    title: string;
    value: string;
}) {

    return (

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">

            <p className="text-sm text-gray-500">
                {title}
            </p>

            <p className="mt-2 text-2xl font-bold">
                {value}
            </p>

        </div>

    );

}


// --------------------------------------------------
// EVENT CARD
// --------------------------------------------------

function EventCard({
                       event,
                   }: {
    event: MajorEvent;
}) {

    const formattedDate =
        new Date(
            `${event.release_date}T00:00:00`
        ).toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric",
            }
        );

    return (

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">

            <div className="flex items-start justify-between gap-4">

                <div>

                    <p className="text-sm font-medium text-gray-400">
                        {formattedDate}
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                        {event.event_name}
                    </h3>

                </div>


                <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">
                    {event.event_type}
                </span>

            </div>


            {event.platform_notes && (

                <p className="mt-4 text-sm text-gray-500">
                    {event.platform_notes}
                </p>

            )}


            {/* ONLY LINKED EVENTS CAN BE ANALYZED */}

            {event.game_id !== null && (

                <Link
                    href={`/events?event=${event.id}`}
                    className="mt-5 inline-block rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:bg-gray-900 hover:text-white"
                >
                    Analyze Event
                </Link>

            )}


        </div>

    );

}


// --------------------------------------------------
// GAME CARD
// --------------------------------------------------

function GameCard({
                      game,
                  }: {
    game: {
        id: number;
        game_name: string;
        genre: string | null;
        tracking_group: string | null;
        player_count: number | null;
        collected_at: string | null;
    };
}) {

    return (

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">

            <h3 className="text-lg font-semibold">
                {game.game_name}
            </h3>


            <p className="mt-4 text-3xl font-bold">
                {game.player_count?.toLocaleString()}
            </p>

            <p className="text-sm text-gray-500">
                current players
            </p>


            <div className="mt-5">

                <p className="text-sm text-gray-300">
                    {game.genre ??
                        "Genre not listed"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                    {game.tracking_group ??
                        "No tracking group"}
                </p>

            </div>


            {game.collected_at && (

                <p className="mt-5 text-xs text-gray-600">

                    Last collected:{" "}

                    {new Date(
                        game.collected_at
                    ).toLocaleString()}

                </p>

            )}


        </div>

    );

}