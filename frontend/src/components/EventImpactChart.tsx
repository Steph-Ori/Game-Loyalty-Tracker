"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

type EventImpactChartProps = {
    data: {
        event: string;
        lift: number;
    }[];
};

export default function EventImpactChart({
                                             data,
                                         }: EventImpactChartProps) {

    return (
        <div
            style={{
                marginTop: "1.5rem",
                background: "#0b1120",
                border: "1px solid #1f2937",
                borderRadius: "14px",
                padding: "1.5rem",
            }}
        >
            <div
                style={{
                    marginBottom: "1rem",
                }}
            >
                <h3
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: "bold",
                    }}
                >
                    Event Impact Comparison
                </h3>

                <p
                    style={{
                        marginTop: "0.35rem",
                        color: "#9ca3af",
                        fontSize: "0.85rem",
                    }}
                >
                    Percent change in average player activity
                    compared with each event&apos;s pre-event baseline.
                </p>
            </div>

            <div
                style={{
                    width: "100%",
                    height: "340px",
                }}
            >
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 10,
                            bottom: 20,
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                        />

                        <XAxis
                            dataKey="event"
                            stroke="#9ca3af"
                            tick={{
                                fill: "#9ca3af",
                                fontSize: 12,
                            }}
                        />

                        <YAxis
                            stroke="#9ca3af"
                            tick={{
                                fill: "#9ca3af",
                                fontSize: 12,
                            }}
                            tickFormatter={
                                (value) =>
                                    `${value}%`
                            }
                        />

                        <Tooltip
                            formatter={
                                (value) => [
                                    `${Number(value).toFixed(1)}%`,
                                    "Event Lift",
                                ]
                            }
                            contentStyle={{
                                background: "#111827",
                                border: "1px solid #374151",
                                borderRadius: "8px",
                            }}
                            labelStyle={{
                                color: "#ffffff",
                            }}
                        />

                        <ReferenceLine
                            y={0}
                            stroke="#9ca3af"
                        />

                        <Bar
                            dataKey="lift"
                            name="Event Lift"
                            fill="#60a5fa"
                            radius={[6, 6, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}