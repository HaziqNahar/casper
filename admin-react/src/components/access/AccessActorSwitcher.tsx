import { useEffect, useMemo, useRef, useState } from "react";
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
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const currentActor = useMemo(
        () => USERS.find((candidate) => candidate.username === value) ?? current,
        [current, value]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div className="header-actor-switcher" ref={containerRef}>
            <button
                type="button"
                className="header-actor-trigger"
                title="Current workflow actor"
                aria-label="Current workflow actor"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((currentOpen) => !currentOpen)}
            >
                <span className="header-actor-triggerText">
                    Acting as {currentActor.displayName} ({currentActor.username})
                </span>
                <ChevronDown
                    size={16}
                    className="header-actor-triggerIcon"
                    style={{ transform: `rotate(${open ? 180 : 0}deg)` }}
                />
            </button>

            {open ? (
                <div className="header-actor-menu" role="listbox">
                    {USERS.map((actor) => {
                        const isActive = actor.username === value;
                        return (
                            <button
                                key={actor.username}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                className={`header-actor-menuItem${isActive ? " is-active" : ""}`}
                                onClick={() => {
                                    setAccessCurrentUser(actor);
                                    setValue(actor.username);
                                    setOpen(false);
                                    window.location.reload();
                                }}
                            >
                                <span className="header-actor-menuName">{actor.displayName}</span>
                                <span className="header-actor-menuMeta">{actor.username}</span>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}