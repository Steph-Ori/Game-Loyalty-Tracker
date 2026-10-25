type EventStatsCardProps = {
    title: string;
    records: number;
    average: number | null;
    peak: number | null;
};

export default function EventStatsCard({
                                           title,
                                           records,
                                           average,
                                           peak,
                                       }: EventStatsCardProps) {
    return (
        <div
            style={{
                background: "#0b1120",
                border: "1px solid #1f2937",
                borderRadius: "12px",
                padding: "1.5rem",
            }}
        >
            <h2>{title}</h2>

            <p>
                <strong>Records:</strong> {records}
            </p>

            <p>
                <strong>Average Players:</strong>{" "}
                {average !== null
                    ? average.toLocaleString()
                    : "Not enough data yet"}
            </p>

            <p>
                <strong>Peak Players:</strong>{" "}
                {peak !== null
                    ? peak.toLocaleString()
                    : "Not enough data yet"}
            </p>
        </div>
    );
}