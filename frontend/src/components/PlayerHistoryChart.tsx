"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

import type { PlayerCount } from "@/models/playerCount";

type PlayerHistoryChartProps = {
    data: PlayerCount[];
};

export default function PlayerHistoryChart({
                                               data,
                                           }: PlayerHistoryChartProps) {
    const chartData = data.map((record) => ({
        date: new Date(record.collected_at).toLocaleString(),
        playerCount: record.player_count,
    }));

    return (
        <div
            style={{
                marginTop: "2rem",
                background: "#0b1120",
                border: "1px solid #1f2937",
                borderRadius: "12px",
                padding: "1.5rem",
            }}
        >
            <h2>Player History</h2>

            {chartData.length === 0 ? (
                <p>Not enough data yet</p>
            ) : (
                <div style={{ width: "100%", height: "400px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="date"
                                minTickGap={40}
                            />

                            <YAxis />

                            <Tooltip />

                            <Line
                                type="monotone"
                                dataKey="playerCount"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}