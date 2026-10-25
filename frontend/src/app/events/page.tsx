import { supabase } from "@/lib/supabase";
import { getGames } from "@/lib/games";
import { getMajorEvents } from "@/lib/majorEvents";
import Link from "next/link";

import type { PlayerCount } from "@/models/playerCount";

import EventStatsCard from "@/components/EventStatsCard";
import PlayerHistoryChart from "@/components/PlayerHistoryChart";
import EventSelector from "@/components/EventSelector";

const DAY =
    24 * 60 * 60 * 1000;


type EventsPageProps = {
    searchParams: Promise<{
        event?: string;
    }>;
};


type AnalysisWindow = {
    beforeStart: Date;
    eventStart: Date;
    eventEnd: Date;
    afterEnd: Date;
    hasPostWindow: boolean;
};


type EventStage =
    | "upcoming"
    | "ongoing"
    | "post_collecting"
    | "complete";


function getAverage(
    records: PlayerCount[]
) {

    if (
        records.length === 0
    ) {
        return null;
    }


    const total =
        records.reduce(
            (sum, record) =>
                sum +
                record.player_count,
            0
        );


    return Math.round(
        total /
        records.length
    );

}


function getPeak(
    records: PlayerCount[]
) {

    if (
        records.length === 0
    ) {
        return null;
    }


    return Math.max(
        ...records.map(
            (record) =>
                record.player_count
        )
    );

}


// --------------------------------------------------
// ANALYSIS WINDOWS
//
// These four match the same windows currently used
// by the Loyalty Comparisons page.
//
// All other events fall back to their database
// short/baseline/end-date settings.
// --------------------------------------------------

function getAnalysisWindow(
    event: {
        event_name: string;
        release_date: string;
        end_date: string | null;
        short_window_days: number;
        baseline_window_days: number;
    }
): AnalysisWindow {

    const customWindows: Record<
        string,
        {
            beforeStart: string;
            eventStart: string;
            eventEnd: string;
            afterEnd: string | null;
        }
    > = {

        "ARC Raiders: Frozen Trail": {
            beforeStart:
                "2026-10-04T00:00:00Z",

            eventStart:
                "2026-10-08T00:00:00Z",

            eventEnd:
                "2026-10-12T23:59:59Z",

            afterEnd:
                "2026-10-15T23:59:59Z",
        },


        "ARC Raiders PvE Beta Test": {
            beforeStart:
                "2026-10-10T00:00:00Z",

            eventStart:
                "2026-10-13T00:00:00Z",

            eventEnd:
                "2026-10-20T23:59:59Z",

            afterEnd:
                "2026-10-24T23:59:59Z",
        },


        "Battlefield 6 Season 5": {
            beforeStart:
                "2026-10-08T00:00:00Z",

            eventStart:
                "2026-10-13T00:00:00Z",

            eventEnd:
                "2026-10-23T23:59:59Z",

            afterEnd:
                null,
        },


        "Call of Duty: Modern Warfare 4": {
            beforeStart:
                "2026-10-16T00:00:00Z",

            eventStart:
                "2026-10-23T00:00:00Z",

            eventEnd:
                "2026-10-25T23:59:59Z",

            afterEnd:
                null,
        },

    };


    const custom =
        customWindows[
            event.event_name
            ];


    if (
        custom
    ) {

        const eventEnd =
            new Date(
                custom.eventEnd
            );


        const hasPostWindow =
            custom.afterEnd !==
            null;


        return {

            beforeStart:
                new Date(
                    custom.beforeStart
                ),

            eventStart:
                new Date(
                    custom.eventStart
                ),

            eventEnd,

            afterEnd:
                custom.afterEnd
                    ? new Date(
                        custom.afterEnd
                    )
                    : eventEnd,

            hasPostWindow,

        };

    }


    // --------------------------------------------------
    // FALLBACK FOR OTHER / FUTURE EVENTS
    // --------------------------------------------------

    const eventStart =
        new Date(
            `${event.release_date}T00:00:00Z`
        );


    const baselineDays =
        event.baseline_window_days ||
        event.short_window_days ||
        7;


    const beforeStart =
        new Date(
            eventStart.getTime() -
            baselineDays * DAY
        );


    const eventEnd =
        event.end_date

            ? new Date(
                `${event.end_date}T23:59:59Z`
            )

            : new Date(
                eventStart.getTime() +
                (
                    event.short_window_days ||
                    7
                ) * DAY -
                1
            );


    const afterEnd =
        new Date(
            eventEnd.getTime() +
            (
                event.short_window_days ||
                7
            ) * DAY
        );


    return {
        beforeStart,
        eventStart,
        eventEnd,
        afterEnd,
        hasPostWindow: true,
    };

}


// --------------------------------------------------
// EVENT STAGE
// --------------------------------------------------

function getEventStage(
    eventStart: Date,
    eventEnd: Date,
    afterEnd: Date,
    hasPostWindow: boolean
): EventStage {

    const now =
        new Date();


    if (
        now <
        eventStart
    ) {
        return "upcoming";
    }


    if (
        now <=
        eventEnd
    ) {
        return "ongoing";
    }


    if (
        !hasPostWindow
    ) {
        return "post_collecting";
    }


    if (
        now <=
        afterEnd
    ) {
        return "post_collecting";
    }


    return "complete";

}


// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default async function EventsPage({
                                             searchParams,
                                         }: EventsPageProps) {

    const params =
        await searchParams;


    const games =
        await getGames();


    const events =
        await getMajorEvents();


    const linkedEvents =
        events.filter(
            (event) =>
                event.game_id !==
                null
        );


    if (
        linkedEvents.length === 0
    ) {

        return (

            <main
                style={{
                    minHeight: "100vh",
                    background: "#000000",
                    color: "#ffffff",
                    padding: "2rem 3rem",
                }}
            >

                <h1>
                    Event Analysis
                </h1>

                <p>
                    No linked events were found.
                </p>

            </main>

        );

    }


    const requestedEventId =
        params.event
            ? Number(
                params.event
            )
            : null;


    const selectedEvent =
        linkedEvents.find(
            (event) =>
                event.id ===
                requestedEventId
        ) ??
        linkedEvents[0];


    const selectedGame =
        games.find(
            (game) =>
                game.id ===
                selectedEvent.game_id
        );


    if (
        !selectedGame
    ) {

        return (

            <main
                style={{
                    minHeight: "100vh",
                    background: "#000000",
                    color: "#ffffff",
                    padding: "2rem 3rem",
                }}
            >

                <h1>
                    Event Analysis
                </h1>

                <p>
                    The game linked to this event could not be found.
                </p>

            </main>

        );

    }


    const {
        beforeStart,
        eventStart,
        eventEnd,
        afterEnd,
        hasPostWindow,
    } =
        getAnalysisWindow(
            selectedEvent
        );


    const eventStage =
        getEventStage(
            eventStart,
            eventEnd,
            afterEnd,
            hasPostWindow
        );


    const fetchEnd =
        eventStage === "upcoming"

            ? new Date()

            : eventStage === "ongoing"

                ? new Date()

                : hasPostWindow

                    ? afterEnd

                    : new Date();


    // --------------------------------------------------
    // SAFE EVENT QUERY
    //
    // One event = one game = manageable row count.
    // 5,000 rows is enough for well over 100 days at
    // roughly 48 half-hour samples per day.
    // --------------------------------------------------

    const safeFetchEnd =
        fetchEnd >
        (
            hasPostWindow
                ? afterEnd
                : eventEnd
        )

            ? (
                hasPostWindow
                    ? afterEnd
                    : eventEnd
            )

            : fetchEnd;


    const {
        data,
        error,
    } = await supabase
        .from(
            "player_counts"
        )
        .select(`
            id,
            game_id,
            player_count,
            collected_at
        `)
        .eq(
            "game_id",
            selectedGame.id
        )
        .gte(
            "collected_at",
            beforeStart
                .toISOString()
        )
        .lte(
            "collected_at",
            safeFetchEnd
                .toISOString()
        )
        .order(
            "collected_at",
            {
                ascending: true,
            }
        )
        .range(
            0,
            4999
        );


    if (
        error
    ) {

        return (

            <main
                style={{
                    minHeight: "100vh",
                    background: "#000000",
                    color: "#ffffff",
                    padding: "2rem 3rem",
                }}
            >

                <h1>
                    Event Analysis
                </h1>

                <p>
                    Could not load player-count data.
                </p>

                <p
                    style={{
                        color: "#9ca3af",
                        marginTop: "0.5rem",
                    }}
                >
                    {error.message}
                </p>

            </main>

        );

    }


    const rawPlayerCounts =
        (
            data ??
            []
        ) as PlayerCount[];


    // Ignore zero-value API anomalies everywhere:
    // cards, averages, peaks, record counts, and chart.

    const playerCounts =
        rawPlayerCounts.filter(
            (record) =>
                record.player_count >
                0
        );


    const beforeData =
        playerCounts.filter(
            (record) => {

                const date =
                    new Date(
                        record.collected_at
                    );


                return (
                    date >=
                    beforeStart &&
                    date <
                    eventStart
                );

            }
        );


    const duringData =
        playerCounts.filter(
            (record) => {

                const date =
                    new Date(
                        record.collected_at
                    );


                return (
                    date >=
                    eventStart &&
                    date <=
                    eventEnd
                );

            }
        );


    const afterData =
        hasPostWindow

            ? playerCounts.filter(
                (record) => {

                    const date =
                        new Date(
                            record.collected_at
                        );


                    return (
                        date >
                        eventEnd &&
                        date <=
                        afterEnd
                    );

                }
            )

            : [];


    const beforeAverage =
        getAverage(
            beforeData
        );


    const duringAverage =
        getAverage(
            duringData
        );


    const afterAverage =
        hasPostWindow
            ? getAverage(
                afterData
            )
            : null;


    const beforePeak =
        getPeak(
            beforeData
        );


    const duringPeak =
        getPeak(
            duringData
        );


    const afterPeak =
        hasPostWindow
            ? getPeak(
                afterData
            )
            : null;


    // --------------------------------------------------
    // PAGE
    // --------------------------------------------------

    return (

        <main
            style={{
                minHeight: "100vh",
                background: "#000000",
                color: "#ffffff",
                padding: "2rem 3rem",
            }}
        >

            <div
                style={{
                    width: "100%",
                    maxWidth: "1600px",
                    margin: "0 auto",
                }}
            >

                <h1
                    style={{
                        fontSize: "2.25rem",
                        fontWeight: "bold",
                    }}
                >
                    Event Analysis
                </h1>


                <p
                    style={{
                        marginTop: "0.5rem",
                        color: "#9ca3af",
                    }}
                >
                    Analyze player activity before,
                    during, and after major game events.
                </p>


                <div
                    style={{
                        display: "flex",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        marginTop: "1.25rem",
                        marginBottom: "2rem",
                    }}
                >

                    <Link
                        href="/"
                        style={{
                            padding: "0.65rem 1rem",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#d1d5db",
                            textDecoration: "none",
                            fontSize: "0.9rem",
                        }}
                    >
                        ← Back to Dashboard
                    </Link>


                    <Link
                        href="/comparisons"
                        style={{
                            padding: "0.65rem 1rem",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#d1d5db",
                            textDecoration: "none",
                            fontSize: "0.9rem",
                        }}
                    >
                        Loyalty Comparisons
                    </Link>

                </div>


                <EventSelector
                    events={
                        linkedEvents
                    }
                    selectedEventId={
                        selectedEvent.id
                    }
                />


                <section
                    style={{
                        marginTop: "2rem",
                        background: "#0b1120",
                        border: "1px solid #1f2937",
                        borderRadius: "14px",
                        padding: "1.5rem",
                    }}
                >

                    <p
                        style={{
                            color: "#6b7280",
                            fontSize: "0.8rem",
                        }}
                    >
                        {
                            selectedEvent.event_type
                        }
                    </p>


                    <h2
                        style={{
                            marginTop: "0.35rem",
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                        }}
                    >
                        {
                            selectedEvent.event_name
                        }
                    </h2>


                    <p
                        style={{
                            marginTop: "0.75rem",
                            color: "#d1d5db",
                        }}
                    >
                        <strong>
                            Population analyzed:
                        </strong>{" "}
                        {
                            selectedGame.game_name
                        }
                    </p>


                    <p
                        style={{
                            marginTop: "0.4rem",
                            color: "#d1d5db",
                        }}
                    >
                        <strong>
                            Event Start:
                        </strong>{" "}
                        {
                            selectedEvent.release_date
                        }
                    </p>


                    {
                        selectedEvent.end_date &&
                        (

                            <p
                                style={{
                                    marginTop: "0.4rem",
                                    color: "#d1d5db",
                                }}
                            >
                                <strong>
                                    Event End:
                                </strong>{" "}
                                {
                                    selectedEvent.end_date
                                }
                            </p>

                        )
                    }


                    <p
                        style={{
                            marginTop: "0.6rem",
                            color: "#d1d5db",
                        }}
                    >
                        <strong>
                            Status:
                        </strong>{" "}
                        {
                            eventStage === "upcoming"
                                ? "Upcoming"
                                : eventStage === "ongoing"
                                    ? "Ongoing"
                                    : eventStage === "post_collecting"
                                        ? "Post-event data collecting"
                                        : "Analysis window complete"
                        }
                    </p>


                    <p
                        style={{
                            marginTop: "0.4rem",
                            color: "#d1d5db",
                        }}
                    >
                        <strong>
                            Valid Records Found:
                        </strong>{" "}
                        {
                            playerCounts.length
                        }
                    </p>


                    {
                        rawPlayerCounts.length !==
                        playerCounts.length &&
                        (

                            <p
                                style={{
                                    marginTop: "0.4rem",
                                    color: "#9ca3af",
                                    fontSize: "0.85rem",
                                }}
                            >
                                Ignored{" "}
                                {
                                    rawPlayerCounts.length -
                                    playerCounts.length
                                }{" "}
                                zero-value API sample(s).
                            </p>

                        )
                    }

                </section>


                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "1rem",
                        marginTop: "1.5rem",
                    }}
                >

                    {
                        eventStage === "upcoming" &&
                        beforeData.length === 0

                            ? (

                                <StatusCard
                                    title="Before Event"
                                    status="Baseline not started"
                                    description="Baseline data will begin appearing as the event approaches."
                                />

                            )

                            : (

                                <EventStatsCard
                                    title="Before Event"
                                    records={
                                        beforeData.length
                                    }
                                    average={
                                        beforeAverage
                                    }
                                    peak={
                                        beforePeak
                                    }
                                />

                            )
                    }


                    {
                        eventStage === "upcoming"

                            ? (

                                <StatusCard
                                    title="During Event"
                                    status="Not started yet"
                                    description="Event-period stats will appear once the event begins."
                                />

                            )

                            : (

                                <EventStatsCard
                                    title="During Event"
                                    records={
                                        duringData.length
                                    }
                                    average={
                                        duringAverage
                                    }
                                    peak={
                                        duringPeak
                                    }
                                />

                            )
                    }


                    {
                        eventStage === "upcoming" ||
                        eventStage === "ongoing"

                            ? (

                                <StatusCard
                                    title="After Event"
                                    status="Not started yet"
                                    description="Post-event stats will begin after the event window ends."
                                />

                            )

                            : eventStage === "post_collecting"

                                ? (

                                    hasPostWindow &&
                                    afterData.length > 0

                                        ? (

                                            <EventStatsCard
                                                title="After Event"
                                                records={
                                                    afterData.length
                                                }
                                                average={
                                                    afterAverage
                                                }
                                                peak={
                                                    afterPeak
                                                }
                                            />

                                        )

                                        : (

                                            <StatusCard
                                                title="After Event"
                                                status="Still collecting"
                                                description="Post-event stats will appear once enough post-event data exists."
                                            />

                                        )

                                )

                                : (

                                    <EventStatsCard
                                        title="After Event"
                                        records={
                                            afterData.length
                                        }
                                        average={
                                            afterAverage
                                        }
                                        peak={
                                            afterPeak
                                        }
                                    />

                                )
                    }

                </div>


                <div
                    style={{
                        marginTop: "1.5rem",
                    }}
                >

                    <PlayerHistoryChart
                        data={
                            playerCounts
                        }
                    />

                </div>

            </div>

        </main>

    );

}


// --------------------------------------------------
// STATUS CARD
// --------------------------------------------------

function StatusCard({
                        title,
                        status,
                        description,
                    }: {
    title: string;
    status: string;
    description: string;
}) {

    return (

        <div
            style={{
                background: "#0b1120",
                border: "1px solid #1f2937",
                borderRadius: "14px",
                padding: "1.25rem",
            }}
        >

            <p
                style={{
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                }}
            >
                {title}
            </p>


            <p
                style={{
                    marginTop: "0.5rem",
                    fontSize: "1.15rem",
                    fontWeight: "bold",
                }}
            >
                {status}
            </p>


            <p
                style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                    lineHeight: "1.5",
                }}
            >
                {description}
            </p>

        </div>

    );

}

