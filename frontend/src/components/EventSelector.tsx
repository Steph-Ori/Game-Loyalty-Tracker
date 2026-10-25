"use client";

import { useRouter } from "next/navigation";

type EventOption = {
    id: number;
    event_name: string;
};

type EventSelectorProps = {
    events: EventOption[];
    selectedEventId: number;
};

export default function EventSelector({
                                          events,
                                          selectedEventId,
                                      }: EventSelectorProps) {
    const router = useRouter();

    function handleChange(eventId: string) {
        router.push(`/events?event=${eventId}`);
    }

    return (
        <div style={{ marginBottom: "2rem" }}>
            <label
                htmlFor="event-select"
                style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                }}
            >
                Select Event
            </label>

            <select
                id="event-select"
                value={selectedEventId}
                onChange={(event) => handleChange(event.target.value)}
                style={{
                    width: "100%",
                    maxWidth: "600px",
                    padding: "0.75rem",
                    background: "#0b1120",
                    border: "1px solid #1f2937",
                    borderRadius: "8px",
                    color: "white",
                }}
            >
                {events.map((event) => (
                    <option key={event.id} value={event.id}>
                        {event.event_name}
                    </option>
                ))}
            </select>
        </div>
    );
}