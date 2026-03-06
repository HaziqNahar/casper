// src/pages/Realms/access/accessFilterUtils.ts
// Shared filter + option utilities for RealmAccessRequest / Approve / Verify / Audit
// Drop-in: no external deps.

export type Option = { value: string; label: string };

export type DateRange = { from?: string; to?: string };

/** YYYY-MM-DD in local time */
export function getTodayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Clamp date string (YYYY-MM-DD) to maxIso (YYYY-MM-DD) */
export function clampISOToMax(iso: string | undefined, maxIso: string): string {
    if (!iso) return "";
    return iso > maxIso ? maxIso : iso;
}

/** Ensure range is sane:
 * - clamp to today (or provided maxIso)
 * - if from > to, auto-fix by moving the other end to match
 */
export function normalizeDateRange(
    range: DateRange,
    opts?: { maxIso?: string; fixOrder?: "snap" | "swap" }
): DateRange {
    const maxIso = opts?.maxIso ?? getTodayISO();
    const fixOrder = opts?.fixOrder ?? "snap";

    let from = range.from ? clampISOToMax(range.from, maxIso) : undefined;
    let to = range.to ? clampISOToMax(range.to, maxIso) : undefined;

    if (from && to && from > to) {
        if (fixOrder === "swap") {
            const tmp = from;
            from = to;
            to = tmp;
        } else {
            // "snap": keep the latest change feeling by snapping the other end
            // (caller typically sets from/to separately; snapping avoids range inversion)
            // Here we snap "to" to "from" (safe default).
            to = from;
        }
    }

    return { from, to };
}

/** Parse date-ish strings safely.
 * Accepts:
 * - "YYYY-MM-DD"
 * - full ISO datetime
 * - anything Date can parse
 */
function toTimeOrNull(value?: string | null): number | null {
    if (!value) return null;

    // date-only: treat as local midnight to keep UI intuitive
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const t = new Date(value + "T00:00:00").getTime();
        return Number.isNaN(t) ? null : t;
    }

    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
}

/** Check if `valueIso` is within dateRange (inclusive).
 * - If range.from is set: value >= from 00:00:00
 * - If range.to is set: value <= to 23:59:59
 */
export function inDateRange(valueIso: string, range: DateRange): boolean {
    const t = toTimeOrNull(valueIso);
    if (t == null) return true; // don't block rows with weird dates

    const from = range.from ? toTimeOrNull(range.from + "T00:00:00") : null;
    const to = range.to ? toTimeOrNull(range.to + "T23:59:59") : null;

    if (from != null && t < from) return false;
    if (to != null && t > to) return false;
    return true;
}

/** Compact chip text for the Date filter */
export function dateChipText(range: DateRange): string {
    return range.from || range.to ? `${range.from || "…"} – ${range.to || "…"}` : "Any";
}

/** Normalize values for filters (trim, string, safe empty -> "") */
export function norm(v: unknown): string {
    if (v == null) return "";
    return String(v).trim();
}

/** Unique + sorted string list */
export function uniqueSorted(values: Array<string | undefined | null>): string[] {
    return Array.from(new Set(values.map((v) => norm(v)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
    );
}

/** Convert a list to Option[] */
export function toOptions(list: string[]): Option[] {
    return list.map((v) => ({ value: v, label: v }));
}

/** Build filter options from rows using a getter */
export function buildOptions<T>(rows: T[], getValue: (row: T) => unknown): Option[] {
    return toOptions(uniqueSorted(rows.map((r) => norm(getValue(r)))));
}

/** Apply a single multi-select filter */
export function applyMultiFilter<T>(
    rows: T[],
    selected: string[],
    getValue: (row: T) => unknown
): T[] {
    if (!selected || selected.length === 0) return rows;
    const set = new Set(selected.map(norm));
    return rows.filter((r) => set.has(norm(getValue(r))));
}

/** Generic multi-filter model */
export type MultiFilterConfig<T> = Record<
    string,
    {
        selected: string[];
        getValue: (row: T) => unknown;
    }
>;

/** Apply many multi-select filters (AND logic) */
export function applyMultiFilters<T>(rows: T[], config: MultiFilterConfig<T>): T[] {
    let out = rows;
    for (const k of Object.keys(config)) {
        const { selected, getValue } = config[k];
        if (!selected || selected.length === 0) continue;
        out = applyMultiFilter(out, selected, getValue);
    }
    return out;
}

/** Apply multi filters + date range in one go */
export function applyFiltersWithDate<T>(params: {
    rows: T[];
    multi: MultiFilterConfig<T>;
    date?: { range: DateRange; getValue: (row: T) => unknown };
}): T[] {
    const { rows, multi, date } = params;

    let out = applyMultiFilters(rows, multi);

    if (date && (date.range.from || date.range.to)) {
        out = out.filter((r) => inDateRange(norm(date.getValue(r)), date.range));
    }

    return out;
}

/** Cascaded options:
 * Example: app options depend on selected realms
 */
export function cascadedOptions<T>(params: {
    rows: T[];
    parentSelected: string[];
    getParent: (row: T) => unknown;
    getChild: (row: T) => unknown;
}): Option[] {
    const { rows, parentSelected, getParent, getChild } = params;

    const base =
        parentSelected && parentSelected.length
            ? applyMultiFilter(rows, parentSelected, getParent)
            : rows;

    return buildOptions(base, getChild);
}

/** When parent filter changes, clean up child selected values so they stay valid */
export function pruneSelectedByOptions(selected: string[], options: Option[]): string[] {
    if (!selected || selected.length === 0) return [];
    const allowed = new Set(options.map((o) => norm(o.value)));
    return selected.map(norm).filter((v) => allowed.has(v));
}