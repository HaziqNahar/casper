import React, { useMemo, useState } from "react";

type UserTypeRow = {
    id: string;
    userTypeTitle: string;
    userTypeDesc?: string;

    username: string;

    fa1: string; // 1FA
    fa2: React.ReactNode; // 2FA (can contain extra notes)

    useCase: string;
    useCaseExtra?: string;
};

const DEFAULT_USER_TYPES: UserTypeRow[] = [
    {
        id: "certis-full",
        userTypeTitle: "Certis Full User",
        userTypeDesc: "Users with valid Certis employee/contractor ID and email address",
        username: "Certis Email Address",
        fa1: "Password",
        fa2: "TOTP",
        useCase: "Web application and mobile app access",
    },
    {
        id: "certis-contractor",
        userTypeTitle: "Certis Contractor",
        userTypeDesc: "Certis contractor with contractor ID and Certis email address",
        username: "Certis Email Address",
        fa1: "Password",
        fa2: (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div>TOTP</div>
                <div className="note-highlight">Additional Email OTP required once a day</div>
            </div>
        ),
        useCase: "Web application and mobile app access",
    },
    {
        id: "certis-half",
        userTypeTitle: "Certis Half User",
        userTypeDesc: "Users with valid Certis employee ID only",
        username: "Certis Employee ID",
        fa1: "Password",
        fa2: "Staff Card (NFC) + PIN",
        useCase: "Mobile app access only",
    },
    {
        id: "external",
        userTypeTitle: "External Users",
        userTypeDesc: "External users identified by their company email address",
        username: "External user company email address",
        fa1: "Password",
        fa2: (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div>TOTP</div>
                <div className="note-highlight">Additional Email OTP required once a day</div>
            </div>
        ),
        useCase: "Web application and mobile app access",
    },
    {
        id: "local-user",
        userTypeTitle: "Local User",
        userTypeDesc: "For scenarios where all other user types are not suitable. E.g. break glass account.",
        username: "Custom Username",
        fa1: "Password",
        fa2: (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div>Yubikey + PIN</div>
                <div style={{ opacity: 0.75 }}>or</div>
                <div>TOTP</div>
            </div>
        ),
        useCase: "Web application and mobile app access",
        useCaseExtra: "May also be used for command/admin access.",
    },
];

export const UserTypesTab: React.FC<{ rows?: UserTypeRow[] }> = ({ rows = DEFAULT_USER_TYPES }) => {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            return (
                r.userTypeTitle.toLowerCase().includes(q) ||
                (r.userTypeDesc ?? "").toLowerCase().includes(q) ||
                r.username.toLowerCase().includes(q) ||
                r.fa1.toLowerCase().includes(q) ||
                String(r.useCase).toLowerCase().includes(q)
            );
        });
    }, [rows, query]);

    return (
        <div style={{ width: "100%", minWidth: 0 }}>
            {/* Search + count */}
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ position: "relative" }}>
                        <input
                            className="form-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by user type, 2FA, use case..."
                            style={{ paddingLeft: "2.5rem", borderRadius: "0.5rem" }}
                        />
                        <span
                            style={{
                                position: "absolute",
                                left: "0.75rem",
                                top: "50%",
                                transform: "translateY(-50%)",
                                opacity: 0.65,
                            }}
                        >
                            🔍
                        </span>
                    </div>
                </div>

                <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                    {filtered.length} records
                </div>
            </div>

            {/* Table */}
            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: "320px" }}>USER TYPE</th>
                            <th style={{ width: "220px" }}>USERNAME</th>
                            <th style={{ width: "140px" }}>1FA</th>
                            <th>2FA</th>
                            <th style={{ width: "280px" }}>USE CASE</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.id}>
                                <td style={{ verticalAlign: "top" }}>
                                    <div style={{ fontWeight: 700, color: "rgba(15,23,42,0.92)" }}>{r.userTypeTitle}</div>
                                    {r.userTypeDesc && (
                                        <div style={{ marginTop: 6, fontSize: "0.82rem", color: "rgba(15,23,42,0.68)" }}>
                                            {r.userTypeDesc}
                                        </div>
                                    )}
                                </td>

                                <td style={{ verticalAlign: "top" }}>
                                    <div style={{ fontWeight: 600 }}>{r.username}</div>
                                </td>

                                <td style={{ verticalAlign: "top" }}>
                                    <span className="pill info">{r.fa1}</span>
                                </td>

                                <td style={{ verticalAlign: "top" }}>
                                    <div style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
                                        <div className="pill info" style={{ width: "fit-content" }}>
                                            {typeof r.fa2 === "string" ? r.fa2 : "2FA"}
                                        </div>
                                        {/* render full 2FA details (supports the highlighted note blocks) */}
                                        <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.82)" }}>{r.fa2}</div>
                                    </div>
                                </td>

                                <td style={{ verticalAlign: "top" }}>
                                    <div style={{ fontWeight: 600 }}>{r.useCase}</div>
                                    {r.useCaseExtra && (
                                        <div style={{ marginTop: 6, fontSize: "0.82rem", color: "rgba(15,23,42,0.68)" }}>
                                            {r.useCaseExtra}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: "1.25rem", textAlign: "center", color: "rgba(15,23,42,0.55)" }}>
                                    No results found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* simple footer */}
                <div className="table-footer">
                    <div>Showing 1 - {filtered.length} of {filtered.length}</div>
                </div>
            </div>
        </div>
    );
};
