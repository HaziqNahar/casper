import { useEffect, useRef, useState } from "react";

interface Props {
    from?: string;
    to?: string;
    onChange: (range: { from?: string; to?: string }) => void;
}

const todayISO = new Date().toISOString().slice(0, 10);

export default function DateRangeFilter({ from, to, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const label =
        from || to
            ? `Date: ${from || "…"} – ${to || "…"}`
            : "Date";

    const setFrom = (v: string) => {
        onChange({ from: v, to });
    };

    const setTo = (v: string) => {
        onChange({ from, to: v });
    };

    const clear = () => {
        onChange({ from: undefined, to: undefined });
    };

    // close when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="kc_dateFilter" ref={ref}>
            <button
                className="kc_filterBadge"
                onClick={() => setOpen((v) => !v)}
            >
                {label}
            </button>

            {open && (
                <div className="kc_dateMenu">

                    <div className="kc_dateMenuTitle">
                        Date range
                    </div>

                    <div className="kc_dateMenuRow">
                        <label>From</label>
                        <input
                            type="date"
                            className="kc-input"
                            max={todayISO}
                            value={from || ""}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>

                    <div className="kc_dateMenuRow">
                        <label>To</label>
                        <input
                            type="date"
                            className="kc-input"
                            max={todayISO}
                            value={to || ""}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    <div className="kc_dateMenuActions">
                        <button
                            className="kc-btn kc-btn-ghost"
                            onClick={clear}
                        >
                            Clear
                        </button>

                        <button
                            className="kc-btn kc-btn-primary"
                            onClick={() => setOpen(false)}
                        >
                            Apply
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}