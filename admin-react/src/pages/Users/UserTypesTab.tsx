import React, { useMemo, useState } from "react";

type UserTypeRow = {
    id: string;
    userTypeTitle: string;
    userTypeDesc?: string;
    username: string;
    fa1: string;
    fa2: React.ReactNode;
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
            <div className="userTypes-twoFactorStack">
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
            <div className="userTypes-twoFactorStack">
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
            <div className="userTypes-twoFactorStack">
                <div>Yubikey + PIN</div>
                <div className="userTypes-twoFactorDivider">or</div>
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
        return rows.filter((r) => (
            r.userTypeTitle.toLowerCase().includes(q) ||
            (r.userTypeDesc ?? "").toLowerCase().includes(q) ||
            r.username.toLowerCase().includes(q) ||
            r.fa1.toLowerCase().includes(q) ||
            String(r.useCase).toLowerCase().includes(q)
        ));
    }, [rows, query]);

    return (
        <div className="userTypes-root">
            <div className="userTypes-toolbar">
                <div className="userTypes-searchWrap">
                    <div className="userTypes-searchField">
                        <input
                            className="form-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by user type, 2FA, use case..."
                            style={{ paddingLeft: "2.5rem" }}
                        />
                        <span className="userTypes-searchIcon">🔍</span>
                    </div>
                </div>

                <div className="userTypes-recordCount">{filtered.length} records</div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th className="userTypes-colType">USER TYPE</th>
                            <th className="userTypes-colUsername">USERNAME</th>
                            <th className="userTypes-colFa1">1FA</th>
                            <th>2FA</th>
                            <th className="userTypes-colUseCase">USE CASE</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.id}>
                                <td className="userTypes-cellTop">
                                    <div className="userTypes-title">{r.userTypeTitle}</div>
                                    {r.userTypeDesc && (
                                        <div className="userTypes-secondaryText">{r.userTypeDesc}</div>
                                    )}
                                </td>

                                <td className="userTypes-cellTop">
                                    <div className="userTypes-strongText">{r.username}</div>
                                </td>

                                <td className="userTypes-cellTop">
                                    <span className="pill info">{r.fa1}</span>
                                </td>

                                <td className="userTypes-cellTop">
                                    <div className="userTypes-twoFactorBlock">
                                        <div className="pill info userTypes-pillFit">
                                            {typeof r.fa2 === "string" ? r.fa2 : "2FA"}
                                        </div>
                                        <div className="userTypes-twoFactorText">{r.fa2}</div>
                                    </div>
                                </td>

                                <td className="userTypes-cellTop">
                                    <div className="userTypes-strongText">{r.useCase}</div>
                                    {r.useCaseExtra && (
                                        <div className="userTypes-secondaryText">{r.useCaseExtra}</div>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="userTypes-emptyCell">
                                    No results found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="table-footer">
                    <div>Showing 1 - {filtered.length} of {filtered.length}</div>
                </div>
            </div>
        </div>
    );
};