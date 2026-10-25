import { supabase } from "@/lib/supabase";
import { getGames } from "@/lib/games";
import { getMajorEvents } from "@/lib/majorEvents";
import Link from "next/link";
import EventImpactChart from "@/components/EventImpactChart";

type ComparisonGame = {
    id: number;
    game_name: string;
    genre: string | null;

    player_count: number | null;
    collected_at: string | null;

    trend_percent: number | null;
    trend_start: number | null;

    seven_day_average: number | null;
    seven_day_peak: number | null;
    seven_day_change: number | null;
    seven_day_start: number | null;
};

type PlayerRecord = {
    game_id: number;
    player_count: number;
    collected_at: string;
};

type LoyaltyEvent = {
    id: number;
    event_name: string;
    event_type: string;
    release_date: string;
    end_date: string | null;
    game_id: number | null;
    short_window_days: number;
    standard_window_days: number;
    baseline_window_days: number;
};

type WindowStats = {
    records: number;
    average: number | null;
    peak: number | null;
    low: number | null;
};

type LoyaltySummary = {
    event: LoyaltyEvent;

    populationName: string;

    baseline: WindowStats;
    during: WindowStats;
    post: WindowStats;

    eventLift: number | null;
    postVsBaseline: number | null;
    retention: number | null;

    postOverlap: boolean;

    baselineStart: Date;
    eventStart: Date;
    eventEnd: Date;
    postEnd: Date;

    signal: string;
    signalDescription: string;
};

const DAY =
    24 * 60 * 60 * 1000;


// --------------------------------------------------
// WINDOW STAT HELPERS
// --------------------------------------------------

function calculateStats(
    records: PlayerRecord[]
): WindowStats {

    // Ignore 0-player readings.
    // We already found these can be bad API samples.
    const validRecords =
        records.filter(
            (record) =>
                record.player_count > 0
        );

    if (validRecords.length === 0) {

        return {
            records: 0,
            average: null,
            peak: null,
            low: null,
        };

    }

    const total =
        validRecords.reduce(
            (sum, record) =>
                sum + record.player_count,
            0
        );

    const values =
        validRecords.map(
            (record) =>
                record.player_count
        );

    return {
        records: validRecords.length,

        average:
            Math.round(
                total /
                validRecords.length
            ),

        peak:
            Math.max(...values),

        low:
            Math.min(...values),
    };

}


function calculatePercentChange(
    oldValue: number | null,
    newValue: number | null
): number | null {

    if (
        oldValue === null ||
        newValue === null ||
        oldValue <= 0
    ) {
        return null;
    }

    return (
        (
            newValue -
            oldValue
        ) /
        oldValue
    ) * 100;

}


function calculateRetention(
    duringAverage: number | null,
    postAverage: number | null
): number | null {

    if (
        duringAverage === null ||
        postAverage === null ||
        duringAverage <= 0
    ) {
        return null;
    }

    return (
        postAverage /
        duringAverage
    ) * 100;

}


function formatPercent(
    value: number | null
) {

    if (value === null) {
        return "Not enough data";
    }

    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

}


// --------------------------------------------------
// EVENT WINDOW
// --------------------------------------------------

function getEventWindow(
    event: LoyaltyEvent
) {

    const customWindows: Record<
        string,
        {
            baselineStart: string;
            eventStart: string;
            eventEnd: string;
            postEnd: string | null;
        }
    > = {

        "ARC Raiders: Frozen Trail": {
            baselineStart: "2026-10-04T00:00:00Z",
            eventStart: "2026-10-08T00:00:00Z",
            eventEnd: "2026-10-12T23:59:59Z",
            postEnd: "2026-10-15T23:59:59Z",
        },

        "ARC Raiders PvE Beta Test": {
            baselineStart: "2026-10-10T00:00:00Z",
            eventStart: "2026-10-13T00:00:00Z",
            eventEnd: "2026-10-20T23:59:59Z",
            postEnd: "2026-10-24T23:59:59Z",
        },

        "Battlefield 6 Season 5": {
            baselineStart: "2026-10-08T00:00:00Z",
            eventStart: "2026-10-13T00:00:00Z",
            eventEnd: "2026-10-23T23:59:59Z",
            postEnd: null,
        },

        "Call of Duty: Modern Warfare 4": {
            baselineStart: "2026-10-16T00:00:00Z",
            eventStart: "2026-10-23T00:00:00Z",
            eventEnd: "2026-10-25T23:59:59Z",
            postEnd: null,
        },

    };

    const custom =
        customWindows[event.event_name];

    if (custom) {

        const eventEnd =
            new Date(custom.eventEnd);

        return {
            baselineStart:
                new Date(custom.baselineStart),

            eventStart:
                new Date(custom.eventStart),

            eventEnd,

            postEnd:
                custom.postEnd
                    ? new Date(custom.postEnd)
                    : eventEnd,
        };

    }

    const baselineDays =
        event.baseline_window_days || 5;

    const standardDays =
        event.standard_window_days || 5;

    const postDays =
        event.short_window_days || 3;

    const eventStart =
        new Date(
            `${event.release_date}T00:00:00Z`
        );

    const baselineStart =
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
                standardDays * DAY -
                1
            );

    const postEnd =
        new Date(
            eventEnd.getTime() +
            postDays * DAY
        );

    return {
        baselineStart,
        eventStart,
        eventEnd,
        postEnd,
    };

}


// --------------------------------------------------
// LOYALTY SIGNAL
// --------------------------------------------------

function getLoyaltySignal(
    eventLift: number | null,
    postVsBaseline: number | null,
    retention: number | null,
    postRecords: number
) {

    // No post-event data yet
    if (
        postRecords === 0 ||
        postVsBaseline === null
    ) {

        if (
            eventLift !== null &&
            eventLift >= 50
        ) {

            return {
                signal:
                    "Strong Event Lift",

                description:
                    "Player activity increased sharply during the event. More post-event data is still needed to judge retention.",
            };

        }

        if (
            eventLift !== null &&
            eventLift >= 10
        ) {

            return {
                signal:
                    "Positive Event Lift",

                description:
                    "Player activity increased during the event, but more post-event data is needed before judging retention.",
            };

        }

        return {
            signal:
                "Still Collecting",

            description:
                "There is not enough post-event data yet to make a strong loyalty conclusion.",
        };

    }


    // Strong sustained increase
    if (
        postVsBaseline >= 50
    ) {

        return {
            signal:
                "Strong Sustained Activity",

            description:
                "Player activity remained well above the pre-event baseline after the event window.",
        };

    }


    // Moderate positive result
    if (
        postVsBaseline >= 10
    ) {

        return {
            signal:
                "Positive Retention",

            description:
                "Post-event activity remained above the pre-event baseline.",
        };

    }


    // Near baseline
    if (
        postVsBaseline >= -10
    ) {

        return {
            signal:
                "Stable",

            description:
                "Post-event activity returned close to the original baseline.",
        };

    }


    // Retention specifically weak
    if (
        retention !== null &&
        retention < 75
    ) {

        return {
            signal:
                "Cooling",

            description:
                "The event did not maintain most of its player activity after the event window ended.",
        };

    }


    return {
        signal:
            "Declining",

        description:
            "Player activity declined after the event and fell below the earlier baseline.",
    };

}


// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default async function ComparisonsPage() {

    const games =
        await getGames();

    const events =
        (await getMajorEvents()) as LoyaltyEvent[];


    // --------------------------------------------------
    // LIVE COMPARISON DATA
    //
    // Fetch each displayed game separately.
    // At ~48 samples/day, one 7-day game query is only
    // about 336 rows, so this avoids cross-game truncation.
    // --------------------------------------------------

    const liveComparisonNames = [

        "ARC Raiders",
        "Escape from Tarkov",
        "Delta Force",

        "Call of Duty",
        "Call of Duty: Modern Warfare III",

        "Grand Theft Auto V Enhanced",
        "Red Dead Redemption 2",
        "Cyberpunk 2077",
        "The Elder Scrolls V: Skyrim Special Edition",
        "The Witcher 3: Wild Hunt",
        "Baldur's Gate 3",
        "Elden Ring",

    ];


    const liveComparisonGames =
        games.filter(
            (game) =>
                liveComparisonNames.includes(
                    game.game_name
                )
        );


    const sevenDaysAgo =
        new Date(
            new Date().getTime() -
            7 * DAY
        );


    const historyByGame =
        new Map<
            number,
            PlayerRecord[]
        >();


    let liveDataError:
        string | null = null;


    const liveResults =
        await Promise.all(
            liveComparisonGames.map(
                async (game) => {

                    const {
                        data,
                        error,
                    } = await supabase
                        .from("player_counts")
                        .select(`
                            game_id,
                            player_count,
                            collected_at
                        `)
                        .eq(
                            "game_id",
                            game.id
                        )
                        .gte(
                            "collected_at",
                            sevenDaysAgo.toISOString()
                        )
                        .order(
                            "collected_at",
                            {
                                ascending: true,
                            }
                        )
                        .range(
                            0,
                            999
                        );


                    return {
                        gameId:
                        game.id,

                        records:
                            (data ?? []) as PlayerRecord[],

                        error:
                            error?.message ?? null,
                    };

                }
            )
        );


    for (
        const result of liveResults
        ) {

        if (
            result.error
        ) {

            liveDataError =
                result.error;

            continue;

        }


        historyByGame.set(
            result.gameId,
            result.records
        );

    }


    if (
        liveDataError
    ) {

        console.error(
            "Live comparison data error:",
            liveDataError
        );

    }


    // --------------------------------------------------
    // CURRENT COMPARISON CARD BUILDER
    // --------------------------------------------------

    const findGame = (
        name: string
    ): ComparisonGame | undefined => {

        const game =
            games.find(
                (game) =>
                    game.game_name
                        .toLowerCase() ===
                    name.toLowerCase()
            );


        if (!game) {
            return undefined;
        }


        const history =
            historyByGame.get(
                game.id
            ) ?? [];


        // Ignore zero-value API anomalies.
        const validHistory =
            history.filter(
                (record) =>
                    record.player_count > 0
            );


        const latest =
            validHistory.length > 0
                ? validHistory[
                validHistory.length - 1
                    ]
                : null;


        // --------------------------------------------------
        // 24-HOUR TREND
        // --------------------------------------------------

        const twentyFourHoursAgo =
            new Date(
                new Date().getTime() -
                24 * 60 * 60 * 1000
            );


        const last24Hours =
            validHistory.filter(
                (record) =>
                    new Date(
                        record.collected_at
                    ) >= twentyFourHoursAgo
            );


        const first24 =
            last24Hours.length > 0
                ? last24Hours[0]
                : null;


        let trendPercent:
            number | null = null;


        if (
            first24 &&
            latest &&
            first24.player_count > 0 &&
            last24Hours.length >= 2
        ) {

            trendPercent =
                (
                    (
                        latest.player_count -
                        first24.player_count
                    ) /
                    first24.player_count
                ) * 100;

        }


        // --------------------------------------------------
        // 7-DAY METRICS
        // --------------------------------------------------

        let sevenDayAverage:
            number | null = null;

        let sevenDayPeak:
            number | null = null;

        let sevenDayChange:
            number | null = null;

        const sevenDayStart =
            validHistory.length > 0
                ? validHistory[0]
                : null;


        if (
            validHistory.length > 0
        ) {

            const total =
                validHistory.reduce(
                    (sum, record) =>
                        sum +
                        record.player_count,
                    0
                );


            sevenDayAverage =
                Math.round(
                    total /
                    validHistory.length
                );


            sevenDayPeak =
                Math.max(
                    ...validHistory.map(
                        (record) =>
                            record.player_count
                    )
                );

        }


        if (
            sevenDayStart &&
            latest &&
            sevenDayStart.player_count > 0 &&
            validHistory.length >= 2
        ) {

            sevenDayChange =
                (
                    (
                        latest.player_count -
                        sevenDayStart.player_count
                    ) /
                    sevenDayStart.player_count
                ) * 100;

        }


        return {

            id:
            game.id,

            game_name:
            game.game_name,

            genre:
            game.genre,

            player_count:
                latest?.player_count ??
                null,

            collected_at:
                latest?.collected_at ??
                null,

            trend_percent:
            trendPercent,

            trend_start:
                first24?.player_count ??
                null,

            seven_day_average:
            sevenDayAverage,

            seven_day_peak:
            sevenDayPeak,

            seven_day_change:
            sevenDayChange,

            seven_day_start:
                sevenDayStart?.player_count ??
                null,

        };

    };


    // --------------------------------------------------
    // QUICK COMPARISON GROUPS
    // --------------------------------------------------

    const arcRaidersGroup = [

        findGame("ARC Raiders"),

        findGame(
            "Escape from Tarkov"
        ),

        findGame(
            "Delta Force"
        ),

    ].filter(
        (game):
        game is ComparisonGame =>
            game !== undefined
    );


    // MW4 itself is no longer used as a
    // standalone Steam population.
    //
    // The MW4 release event now analyzes
    // the Call of Duty ecosystem instead.

    const codGroup = [

        findGame(
            "Call of Duty"
        ),

        findGame(
            "Call of Duty: Modern Warfare III"
        ),

    ].filter(
        (game):
        game is ComparisonGame =>
            game !== undefined
    );


    const gtaGroup = [

        findGame(
            "Grand Theft Auto V Enhanced"
        ),

        findGame(
            "Red Dead Redemption 2"
        ),

        findGame(
            "Cyberpunk 2077"
        ),

        findGame(
            "The Elder Scrolls V: Skyrim Special Edition"
        ),

        findGame(
            "The Witcher 3: Wild Hunt"
        ),

        findGame(
            "Baldur's Gate 3"
        ),

        findGame(
            "Elden Ring"
        ),

    ].filter(
        (game):
        game is ComparisonGame =>
            game !== undefined
    );


    // --------------------------------------------------
    // EVENTS WE WANT FOR LOYALTY ANALYSIS
    // --------------------------------------------------

    const targetEventNames = [

        "ARC Raiders: Frozen Trail",

        "ARC Raiders PvE Beta Test",

        "Battlefield 6 Season 5",

        "Call of Duty: Modern Warfare 4",

    ];


    const loyaltyEvents =
        events.filter(
            (event) =>
                targetEventNames.includes(
                    event.event_name
                ) &&
                event.game_id !== null
        );


    // --------------------------------------------------
    // LOAD + BUILD EACH EVENT SUMMARY SEPARATELY
    // --------------------------------------------------

    const loyaltySummaries:
        LoyaltySummary[] = [];


    for (
        const event of loyaltyEvents
        ) {

        if (
            event.game_id === null
        ) {
            continue;
        }

        const {
            baselineStart,
            eventStart,
            eventEnd,
            postEnd,
        } =
            getEventWindow(event);

        const fetchEnd =
            postEnd > eventEnd
                ? postEnd
                : eventEnd;

        const {
            data,
            error,
        } = await supabase
            .from("player_counts")
            .select(`
                game_id,
                player_count,
                collected_at
            `)
            .eq(
                "game_id",
                event.game_id
            )
            .gte(
                "collected_at",
                baselineStart.toISOString()
            )
            .lte(
                "collected_at",
                fetchEnd.toISOString()
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

        const gameRecords =
            error
                ? []
                : (data ?? []) as PlayerRecord[];

        const baselineRecords =
            gameRecords.filter(
                (record) => {

                    const date =
                        new Date(
                            record.collected_at
                        );

                    return (
                        date >= baselineStart &&
                        date < eventStart
                    );

                }
            );

        const duringRecords =
            gameRecords.filter(
                (record) => {

                    const date =
                        new Date(
                            record.collected_at
                        );

                    return (
                        date >= eventStart &&
                        date <= eventEnd
                    );

                }
            );

        const hasPostWindow =
            postEnd > eventEnd;

        const postRecords =
            hasPostWindow
                ? gameRecords.filter(
                    (record) => {

                        const date =
                            new Date(
                                record.collected_at
                            );

                        return (
                            date > eventEnd &&
                            date <= postEnd
                        );

                    }
                )
                : [];

        const baseline =
            calculateStats(
                baselineRecords
            );

        const during =
            calculateStats(
                duringRecords
            );

        const post =
            calculateStats(
                postRecords
            );

        const eventLift =
            calculatePercentChange(
                baseline.average,
                during.average
            );

        const postVsBaseline =
            hasPostWindow
                ? calculatePercentChange(
                    baseline.average,
                    post.average
                )
                : null;

        const retention =
            hasPostWindow
                ? calculateRetention(
                    during.average,
                    post.average
                )
                : null;

        const postOverlap =
            hasPostWindow &&
            events.some(
                (otherEvent) => {

                    if (
                        otherEvent.id ===
                        event.id ||
                        otherEvent.game_id !==
                        event.game_id
                    ) {
                        return false;
                    }

                    const otherStart =
                        new Date(
                            `${otherEvent.release_date}T00:00:00Z`
                        );

                    const otherEnd =
                        otherEvent.end_date

                            ? new Date(
                                `${otherEvent.end_date}T23:59:59Z`
                            )

                            : otherStart;

                    return (
                        otherStart <=
                        postEnd &&
                        otherEnd >
                        eventEnd
                    );

                }
            );

        const {
            signal,
            description,
        } =
            getLoyaltySignal(
                eventLift,
                postVsBaseline,
                retention,
                post.records
            );

        const population =
            games.find(
                (game) =>
                    game.id ===
                    event.game_id
            );

        loyaltySummaries.push({

            event,

            populationName:
                population?.game_name ??
                "Unknown",

            baseline,
            during,
            post,

            eventLift,
            postVsBaseline,
            retention,

            postOverlap,

            baselineStart,
            eventStart,
            eventEnd,
            postEnd,

            signal,

            signalDescription:
                hasPostWindow
                    ? description
                    : (
                        eventLift !== null
                            ? "The event is still within its active analysis window. Post-event retention will be calculated once enough post-event data exists."
                            : "There is not enough event data yet to calculate a loyalty signal."
                    ),

        });

    }


    // --------------------------------------------------
    // EVENT IMPACT CHART DATA
    // --------------------------------------------------

    const eventImpactChartData =
        loyaltySummaries
            .filter(
                (summary) =>
                    summary.eventLift !== null
            )
            .map(
                (summary) => {

                    const shortName =
                        summary.event.event_name ===
                        "ARC Raiders: Frozen Trail"

                            ? "Frozen Trail"

                            : summary.event.event_name ===
                            "ARC Raiders PvE Beta Test"

                                ? "ARC PvE Beta"

                                : summary.event.event_name ===
                                "Battlefield 6 Season 5"

                                    ? "BF6 Season 5"

                                    : summary.event.event_name ===
                                    "Call of Duty: Modern Warfare 4"

                                        ? "MW4 Release"

                                        : summary.event.event_name;

                    return {
                        event:
                        shortName,

                        lift:
                            Number(
                                summary.eventLift!.toFixed(1)
                            ),
                    };

                }
            )
            .sort(
                (a, b) =>
                    b.lift - a.lift
            );


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
                width: "100%",
            }}
        >

            <div
                style={{
                    width: "100%",
                    maxWidth: "1800px",
                    margin: "0 auto",
                }}
            >

                {/* HEADER */}

                <div
                    style={{
                        marginBottom: "3rem",
                    }}
                >

                    <h1
                        style={{
                            fontSize: "2.25rem",
                            fontWeight: "bold",
                        }}
                    >
                        Game Loyalty Comparisons
                    </h1>

                    <p
                        style={{
                            marginTop: "0.6rem",
                            color: "#9ca3af",
                            fontSize: "1rem",
                        }}
                    >
                        Compare current player activity,
                        event impact, and post-event retention.
                    </p>


                    {/* NAVIGATION */}

                    <div
                        style={{
                            marginTop: "1.25rem",
                            display: "flex",
                            gap: "0.75rem",
                            flexWrap: "wrap",
                        }}
                    >

                        <Link
                            href="/"
                            style={{
                                padding:
                                    "0.65rem 1rem",
                                border:
                                    "1px solid #374151",
                                borderRadius:
                                    "8px",
                                color:
                                    "#d1d5db",
                                textDecoration:
                                    "none",
                                fontSize:
                                    "0.9rem",
                            }}
                        >
                            ← Back to Dashboard
                        </Link>

                        <Link
                            href="/events"
                            style={{
                                padding:
                                    "0.65rem 1rem",
                                border:
                                    "1px solid #374151",
                                borderRadius:
                                    "8px",
                                color:
                                    "#d1d5db",
                                textDecoration:
                                    "none",
                                fontSize:
                                    "0.9rem",
                            }}
                        >
                            Event Analysis
                        </Link>

                    </div>

                </div>


                {/* EVENT LOYALTY ANALYSIS */}

                <section>

                    <h2
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: "bold",
                        }}
                    >
                        Event Loyalty Analysis
                    </h2>

                    <p
                        style={{
                            marginTop: "0.4rem",
                            color: "#9ca3af",
                        }}
                    >
                        Measures how player activity changed
                        before, during, and after major events.
                    </p>


                    <EventImpactChart
                        data={
                            eventImpactChartData
                        }
                    />


                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(520px, 1fr))",
                            gap: "1.5rem",
                            marginTop: "1.5rem",
                        }}
                    >

                        {loyaltySummaries.map(
                            (summary) => (

                                <LoyaltyEventCard
                                    key={
                                        summary.event.id
                                    }
                                    summary={
                                        summary
                                    }
                                />

                            )
                        )}

                    </div>

                </section>


                {/* LIVE GAME COMPARISONS */}

                <section
                    style={{
                        marginTop: "4rem",
                    }}
                >

                    <h2
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: "bold",
                        }}
                    >
                        Live Player Comparisons
                    </h2>

                    <p
                        style={{
                            marginTop: "0.4rem",
                            color: "#9ca3af",
                        }}
                    >
                        Compare current activity, 24-hour movement,
                        and 7-day performance across related games.
                    </p>

                </section>


                <ComparisonGroup
                    title="ARC Raiders"
                    description="Extraction-shooter and tactical competitors."
                    games={
                        arcRaidersGroup
                    }
                />


                <ComparisonGroup
                    title="Call of Duty"
                    description="Call of Duty ecosystem and predecessor activity. MW4 launch impact is analyzed above using the Call of Duty Steam population."
                    games={
                        codGroup
                    }
                />


                <ComparisonGroup
                    title="Grand Theft Auto VI"
                    description="Open-world, action RPG, story-driven, and Rockstar-adjacent comparisons."
                    games={
                        gtaGroup
                    }
                />

            </div>

        </main>

    );

}


// --------------------------------------------------
// LOYALTY EVENT CARD
// --------------------------------------------------

function LoyaltyEventCard({
                              summary,
                          }: {
    summary: LoyaltySummary;
}) {

    const hasPostWindow =
        summary.postEnd >
        summary.eventEnd;

    return (

        <div
            style={{
                background:
                    "#0b1120",
                border:
                    "1px solid #1f2937",
                borderRadius:
                    "14px",
                padding:
                    "1.5rem",
            }}
        >

            <p
                style={{
                    color:
                        "#6b7280",
                    fontSize:
                        "0.8rem",
                }}
            >
                {
                    summary.event
                        .event_type
                }
            </p>


            <h3
                style={{
                    marginTop:
                        "0.35rem",
                    fontSize:
                        "1.35rem",
                    fontWeight:
                        "bold",
                }}
            >
                {
                    summary.event
                        .event_name
                }
            </h3>


            <p
                style={{
                    marginTop:
                        "0.35rem",
                    color:
                        "#9ca3af",
                    fontSize:
                        "0.85rem",
                }}
            >
                Population analyzed:{" "}
                <strong>
                    {
                        summary.populationName
                    }
                </strong>
            </p>


            <div
                style={{
                    display:
                        "grid",
                    gridTemplateColumns:
                        "repeat(3, 1fr)",
                    gap:
                        "0.75rem",
                    marginTop:
                        "1.5rem",
                }}
            >

                <MetricBox
                    title="Baseline Avg"
                    value={
                        summary.baseline
                            .average
                    }
                />

                <MetricBox
                    title="Event Avg"
                    value={
                        summary.during
                            .average
                    }
                />

                {hasPostWindow ? (

                    <MetricBox
                        title="Post Avg"
                        value={
                            summary.post
                                .average
                        }
                    />

                ) : (

                    <TextMetricBox
                        title="Post Avg"
                        value="Still collecting"
                    />

                )}

            </div>


            <div
                style={{
                    display:
                        "grid",
                    gridTemplateColumns:
                        "repeat(3, 1fr)",
                    gap:
                        "0.75rem",
                    marginTop:
                        "0.75rem",
                }}
            >

                <TextMetricBox
                    title="Event Lift"
                    value={
                        formatPercent(
                            summary.eventLift
                        )
                    }
                />

                <TextMetricBox
                    title="Post vs Baseline"
                    value={
                        summary.postOverlap
                            ? "Overlapping event"
                            : hasPostWindow
                                ? formatPercent(
                                    summary.postVsBaseline
                                )
                                : "Still collecting"
                    }
                />

                <TextMetricBox
                    title="Retention"
                    value={
                        summary.postOverlap
                            ? "Overlapping event"
                            : hasPostWindow
                                ? (
                                    summary.retention !== null
                                        ? `${summary.retention.toFixed(1)}%`
                                        : "Not enough data"
                                )
                                : "Still collecting"
                    }
                />

            </div>


            <div
                style={{
                    marginTop:
                        "1rem",
                    borderTop:
                        "1px solid #1f2937",
                    paddingTop:
                        "1rem",
                }}
            >

                <p
                    style={{
                        fontSize:
                            "0.8rem",
                        color:
                            "#6b7280",
                    }}
                >
                    Event Peak
                </p>

                <p
                    style={{
                        marginTop:
                            "0.2rem",
                        fontSize:
                            "1.25rem",
                        fontWeight:
                            "bold",
                    }}
                >
                    {
                        summary.during
                            .peak !==
                        null
                            ? summary.during
                                .peak
                                .toLocaleString()
                            : "No data"
                    }
                </p>

            </div>


            <div
                style={{
                    marginTop:
                        "1.25rem",
                    background:
                        "#111827",
                    border:
                        "1px solid #1f2937",
                    borderRadius:
                        "10px",
                    padding:
                        "1rem",
                }}
            >

                <p
                    style={{
                        fontSize:
                            "0.8rem",
                        color:
                            "#9ca3af",
                    }}
                >
                    Loyalty Signal
                </p>

                <p
                    style={{
                        marginTop:
                            "0.25rem",
                        fontSize:
                            "1.1rem",
                        fontWeight:
                            "bold",
                    }}
                >
                    {
                        summary.postOverlap
                            ? "Strong Event Lift"
                            : summary.signal
                    }
                </p>

                <p
                    style={{
                        marginTop:
                            "0.4rem",
                        color:
                            "#9ca3af",
                        fontSize:
                            "0.85rem",
                        lineHeight:
                            "1.5",
                    }}
                >
                    {
                        summary.postOverlap
                            ? "Player activity stayed elevated after the event, but another tracked event overlaps this period, so the post-event result cannot be attributed to this event alone."
                            : summary.signalDescription
                    }
                </p>

            </div>


            {summary.postOverlap && (

                <p
                    style={{
                        marginTop:
                            "1rem",
                        fontSize:
                            "0.8rem",
                        color:
                            "#d1d5db",
                    }}
                >
                    ⚠ Post-event window overlaps another
                    tracked event for this game, so the
                    post-event result should be interpreted
                    carefully.
                </p>

            )}

        </div>

    );

}


// --------------------------------------------------
// METRIC BOXES
// --------------------------------------------------

function MetricBox({
                       title,
                       value,
                   }: {
    title: string;
    value: number | null;
}) {

    return (

        <div
            style={{
                background:
                    "#111827",
                border:
                    "1px solid #1f2937",
                borderRadius:
                    "10px",
                padding:
                    "0.85rem",
            }}
        >

            <p
                style={{
                    fontSize:
                        "0.75rem",
                    color:
                        "#6b7280",
                }}
            >
                {title}
            </p>

            <p
                style={{
                    marginTop:
                        "0.25rem",
                    fontSize:
                        "1.1rem",
                    fontWeight:
                        "bold",
                }}
            >
                {
                    value !== null
                        ? value
                            .toLocaleString()
                        : "No data"
                }
            </p>

        </div>

    );

}


function TextMetricBox({
                           title,
                           value,
                       }: {
    title: string;
    value: string;
}) {

    return (

        <div
            style={{
                background:
                    "#111827",
                border:
                    "1px solid #1f2937",
                borderRadius:
                    "10px",
                padding:
                    "0.85rem",
            }}
        >

            <p
                style={{
                    fontSize:
                        "0.75rem",
                    color:
                        "#6b7280",
                }}
            >
                {title}
            </p>

            <p
                style={{
                    marginTop:
                        "0.25rem",
                    fontSize:
                        "1.05rem",
                    fontWeight:
                        "bold",
                }}
            >
                {value}
            </p>

        </div>

    );

}


// --------------------------------------------------
// LIVE COMPARISON GROUP
// --------------------------------------------------

function ComparisonGroup({
                             title,
                             description,
                             games,
                         }: {
    title: string;
    description: string;
    games: ComparisonGame[];
}) {

    return (

        <section
            style={{
                marginTop:
                    "3rem",
                width:
                    "100%",
            }}
        >

            <div
                style={{
                    marginBottom:
                        "1.25rem",
                }}
            >

                <h2
                    style={{
                        fontSize:
                            "1.6rem",
                        fontWeight:
                            "bold",
                    }}
                >
                    {title}
                </h2>

                <p
                    style={{
                        marginTop:
                            "0.35rem",
                        color:
                            "#9ca3af",
                    }}
                >
                    {description}
                </p>

            </div>


            <div
                style={{
                    display:
                        "grid",

                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(320px, 1fr))",

                    gap:
                        "1.25rem",

                    width:
                        "100%",
                }}
            >

                {
                    games.map(
                        (game) => (

                            <ComparisonGameCard
                                key={
                                    game.id
                                }
                                game={
                                    game
                                }
                            />

                        )
                    )
                }

            </div>

        </section>

    );

}


// --------------------------------------------------
// MINI LIVE METRIC
// --------------------------------------------------

function MiniMetric({
                        title,
                        value,
                    }: {
    title: string;
    value: string;
}) {

    return (

        <div
            style={{
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: "8px",
                padding: "0.7rem",
            }}
        >

            <p
                style={{
                    fontSize: "0.7rem",
                    color: "#6b7280",
                }}
            >
                {title}
            </p>

            <p
                style={{
                    marginTop: "0.2rem",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                }}
            >
                {value}
            </p>

        </div>

    );

}


// --------------------------------------------------
// LIVE GAME CARD
// --------------------------------------------------

function ComparisonGameCard({
                                game,
                            }: {
    game: ComparisonGame;
}) {

    const trend =
        game.trend_percent;


    const trendText =
        trend === null

            ? "Not enough data yet"

            : `${
                trend >= 0
                    ? "+"
                    : ""
            }${trend.toFixed(2)}%`;


    const trendSymbol =
        trend === null

            ? ""

            : trend > 0

                ? "▲"

                : trend < 0

                    ? "▼"

                    : "—";


    return (

        <div
            style={{
                background:
                    "#0b1120",
                border:
                    "1px solid #1f2937",
                borderRadius:
                    "14px",
                padding:
                    "1.4rem",
                width:
                    "100%",
                minHeight:
                    "290px",
            }}
        >

            <h3
                style={{
                    fontSize:
                        "1.15rem",
                    fontWeight:
                        "bold",
                }}
            >
                {game.game_name}
            </h3>


            <p
                style={{
                    marginTop:
                        "0.4rem",
                    color:
                        "#9ca3af",
                    fontSize:
                        "0.9rem",
                }}
            >
                {
                    game.genre ??
                    "Genre not listed"
                }
            </p>


            <div
                style={{
                    marginTop:
                        "1.5rem",
                }}
            >

                <p
                    style={{
                        fontSize:
                            "0.8rem",
                        color:
                            "#6b7280",
                    }}
                >
                    Current Players
                </p>

                <p
                    style={{
                        marginTop:
                            "0.25rem",
                        fontSize:
                            "2rem",
                        fontWeight:
                            "bold",
                    }}
                >
                    {
                        game.player_count !==
                        null

                            ? game.player_count
                                .toLocaleString()

                            : "No data yet"
                    }
                </p>

            </div>


            <div
                style={{
                    marginTop:
                        "1.5rem",
                    borderTop:
                        "1px solid #1f2937",
                    paddingTop:
                        "1.1rem",
                }}
            >

                <p
                    style={{
                        fontSize:
                            "0.8rem",
                        color:
                            "#6b7280",
                    }}
                >
                    24-Hour Change
                </p>

                <p
                    style={{
                        marginTop:
                            "0.3rem",
                        fontSize:
                            "1.3rem",
                        fontWeight:
                            "bold",
                    }}
                >
                    {trendSymbol} {trendText}
                </p>


                {
                    game.trend_start !== null &&
                    game.player_count !== null &&
                    (

                        <p
                            style={{
                                marginTop:
                                    "0.4rem",
                                fontSize:
                                    "0.8rem",
                                color:
                                    "#6b7280",
                            }}
                        >
                            {
                                game.trend_start
                                    .toLocaleString()
                            }
                            {" → "}
                            {
                                game.player_count
                                    .toLocaleString()
                            }
                        </p>

                    )
                }

            </div>


            {/* 7-DAY METRICS */}

            <div
                style={{
                    marginTop: "1.25rem",
                    borderTop: "1px solid #1f2937",
                    paddingTop: "1.1rem",
                }}
            >

                <p
                    style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                    }}
                >
                    7-Day Performance
                </p>


                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(3, 1fr)",
                        gap: "0.75rem",
                        marginTop: "0.75rem",
                    }}
                >

                    <MiniMetric
                        title="Avg"
                        value={
                            game.seven_day_average !== null
                                ? game.seven_day_average.toLocaleString()
                                : "No data"
                        }
                    />

                    <MiniMetric
                        title="Peak"
                        value={
                            game.seven_day_peak !== null
                                ? game.seven_day_peak.toLocaleString()
                                : "No data"
                        }
                    />

                    <MiniMetric
                        title="Change"
                        value={
                            game.seven_day_change !== null
                                ? `${
                                    game.seven_day_change >= 0
                                        ? "+"
                                        : ""
                                }${game.seven_day_change.toFixed(1)}%`
                                : "No data"
                        }
                    />

                </div>


                {
                    game.seven_day_start !== null &&
                    game.player_count !== null &&
                    (

                        <p
                            style={{
                                marginTop: "0.65rem",
                                fontSize: "0.75rem",
                                color: "#6b7280",
                            }}
                        >
                            7-day start:{" "}
                            {
                                game.seven_day_start
                                    .toLocaleString()
                            }
                            {" → "}
                            {
                                game.player_count
                                    .toLocaleString()
                            }
                        </p>

                    )
                }

            </div>


            <div
                style={{
                    marginTop:
                        "1.25rem",
                    fontSize:
                        "0.75rem",
                    color:
                        "#6b7280",
                }}
            >

                {
                    game.collected_at

                        ? `Last collected: ${new Date(
                            game.collected_at
                        ).toLocaleString()}`

                        : "Waiting for first collection"
                }

            </div>

        </div>

    );

}