import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
    getAccessCurrentUser,
    setAccessCurrentUser,
    AccessCurrentUser,
} from "../../context/accessCurrentUser";

const USERS: AccessCurrentUser[] = [
    { username: "admin", role: "admin", displayName: "Admin" },
    { username: "approver.1", role: "approver", displayName: "Approver 1" },
    { username: "verifier.1", role: "verifier", displayName: "Verifier 1" },
];

export default function AccessActorSwitcher() {
    const current = getAccessCurrentUser();
    const [value, setValue] = useState(current.username);

    return (
        <div className="header-actor-switcher">
            <span className="header-actor-label">Acting as</span>

            <div className="header-actor-selectWrap">
                <select
                    className="header-actor-select"
                    value={value}
                    onChange={(e) => {
                        const next = USERS.find((u) => u.username === e.target.value);
                        if (!next) return;
                        setAccessCurrentUser(next);
                        setValue(next.username);
                        window.location.reload();
                    }}
                    title="Current workflow actor"
                >
                    {USERS.map((u) => (
                        <option key={u.username} value={u.username}>
                            {u.displayName} ({u.username})
                        </option>
                    ))}
                </select>

                <span className="header-actor-selectIcon">
                    <ChevronDown size={16} />
                </span>
            </div>
        </div>
    );
}