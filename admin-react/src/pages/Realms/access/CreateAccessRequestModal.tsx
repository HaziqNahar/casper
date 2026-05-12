import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AccessRequest } from "./accessRequestsStore";
import { ApiError } from "../../../services/apiClient";
import { REALM_ROLES } from "../realmTypes";
import SearchableCombobox, { type SearchableComboboxOption } from "../../../components/common/SearchableCombobox";
import { useUnsavedChangesGuard } from "../../../hooks/useUnsavedChangesGuard";

type UserOption = {
    uuid: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    isDeleted?: boolean;
};

type RealmOption = {
    id: string;
    name: string;
    status: string;
}

type RealmMembership = {
    userUuid: string;
    roleId?: string;
    assignedAt?: string;
    assignedBy?: string;
};

type RealmUsersMap = Record<string, RealmMembership[]>;
type PickerOption = SearchableComboboxOption;

type Props = {
    open: boolean;
    initial?: {
        realmId: string;
        realmName: string;
        targetUser: string;
        roleRequested: string;
        currentRoleId?: string;
        justification?: string;
    };
    onClose: () => void;
    onCreated: (req: AccessRequest) => void;
    onCreate: (input: {
        realmId: string;
        realmName: string;
        targetUser: string;
        roleRequested: string;
        justification: string;
        timeBound?: boolean;
        startDate?: string;
        endDate?: string;
        requester: string;
    }) => Promise<AccessRequest>;
    requester: string;

    allUsers: UserOption[];
    allRealms: RealmOption[];
    realmUsersMap: RealmUsersMap;
};

const ROLES = ["realm_user", "realm_manager", "realm_admin"] as const;
type Role = (typeof ROLES)[number];
const TIME_BOUND_REQUIRED_ROLES: readonly Role[] = ["realm_manager", "realm_admin"];
const ROLE_LABELS = Object.fromEntries(REALM_ROLES.map((role) => [role.id, role.name])) as Record<string, string>;

function norm(v?: string) {
    return String(v || "").trim().toLowerCase();
}

function matchUser(allUsers: UserOption[], targetUser?: string) {
    const normalizedTargetUser = norm(targetUser);
    if (!normalizedTargetUser) return null;

    return allUsers.find((user) => norm(user.username) === normalizedTargetUser) ?? null;
}

function userDisplayLabel(user: UserOption) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return fullName || user.username || user.email || "Unknown user";
}

function getFriendlyCreateError(error: unknown, currentRoleId?: string) {
    if (error instanceof ApiError) {
        if (error.message.includes("user_already_has_requested_role")) {
            return currentRoleId
                ? `This user already has ${ROLE_LABELS[currentRoleId] ?? currentRoleId}. Choose a different role to request a change.`
                : "This user already has the requested role. Choose a different role.";
        }

        if (error.message.includes("user_already_in_realm")) {
            return "This user is already in the realm. Use a different role to request a role change instead of new access.";
        }
    }

    return error instanceof Error ? error.message : "Failed to create access request.";
}

function getTodayLocalDateIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

export default function CreateAccessRequestModal(props: Props) {
    if (!props.open) return null;

    const initialKey = [
        props.initial?.realmId ?? "",
        props.initial?.targetUser ?? "",
        props.initial?.roleRequested ?? "",
        props.initial?.currentRoleId ?? "",
        props.initial?.justification ?? "",
    ].join("|");

    return <CreateAccessRequestModalContent key={initialKey} {...props} />;
}

function CreateAccessRequestModalContent({
    onClose,
    onCreated,
    onCreate,
    requester,
    initial,
    allUsers,
    allRealms,
    realmUsersMap,
}: Props) {
    const closeMessage = "Are you sure you want to leave? Your access request changes will not be saved.";
    const currentRoleId = initial?.currentRoleId ?? "";
    const availableRoles = useMemo(
        () => ROLES.filter((role) => role !== currentRoleId),
        [currentRoleId]
    );
    const [realmName, setRealmName] = useState(initial?.realmName ?? "");
    const [realmId, setRealmId] = useState(initial?.realmId ?? "");
    const [targetUser, setTargetUser] = useState(initial?.targetUser ?? "");
    const [roleRequested, setRoleRequested] = useState<Role>(
        (availableRoles as readonly string[]).includes(initial?.roleRequested ?? "")
            ? (initial?.roleRequested as Role)
            : availableRoles[0] ?? ROLES[0]
    );
    const [justification, setJustification] = useState(initial?.justification ?? "");
    const [timeBound, setTimeBound] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const minDate = useMemo(() => getTodayLocalDateIso(), []);
    const isDirty = useMemo(
        () =>
            Boolean(
                realmId.trim() ||
                targetUser.trim() ||
                roleRequested.trim() ||
                justification.trim() ||
                timeBound ||
                startDate ||
                endDate
            ),
        [realmId, targetUser, roleRequested, justification, timeBound, startDate, endDate]
    );
    const { allowNextNavigation } = useUnsavedChangesGuard({
        when: isDirty && !saving,
        message: closeMessage,
    });
    const reset = () => {
        setRealmName("");
        setRealmId("");
        setTargetUser("");
        setRoleRequested(availableRoles[0] ?? ROLES[0]);
        setJustification("");
        setTimeBound(false);
        setStartDate("");
        setEndDate("");
        setError(null);
    };
    const closeSafely = () => {
        if (isDirty && !window.confirm(closeMessage)) {
            return;
        }
        allowNextNavigation();
        reset();
        onClose();
    };

    const assignedUserUuids = useMemo(() => {
        if (!realmId.trim()) return new Set<string>();
        const memberships = realmUsersMap?.[realmId] ?? [];
        return new Set(memberships.map((m) => norm(m.userUuid)));
    }, [realmId, realmUsersMap]);

    const prefilledUser = useMemo(
        () => matchUser(allUsers, initial?.targetUser),
        [allUsers, initial?.targetUser]
    );

    const eligibleUsers = useMemo(() => {
        const baseEligibleUsers = allUsers
            .filter((u) => !u.isDeleted)
            .filter((u) => !!norm(u.uuid))
            .filter((u) => !!norm(u.username))
            .filter((u) => !assignedUserUuids.has(norm(u.uuid)))
            .sort((a, b) => a.username.localeCompare(b.username));

        if (
            prefilledUser &&
            !baseEligibleUsers.some((user) => norm(user.uuid) === norm(prefilledUser.uuid))
        ) {
            return [prefilledUser, ...baseEligibleUsers];
        }

        return baseEligibleUsers;
    }, [allUsers, assignedUserUuids, prefilledUser]);

    const realmOptions = useMemo(() => {
        return allRealms
            .filter((r) => r.status !== "Draft") // optional
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allRealms]);
    const realmPickerOptions = useMemo<SearchableComboboxOption[]>(
        () => realmOptions.map((realm) => ({ value: realm.id, label: realm.name })),
        [realmOptions]
    );
    const rolePickerOptions = useMemo<SearchableComboboxOption[]>(
        () => availableRoles.map((role) => ({ value: role, label: ROLE_LABELS[role] ?? role })),
        [availableRoles]
    );

    const lockRealm = Boolean(initial?.realmId);
    const lockTargetUser = Boolean(initial?.targetUser);
    const lockRole = availableRoles.length <= 1;

    const effectiveTargetUser = useMemo(() => {
        if (!targetUser) return "";
        if (lockTargetUser && prefilledUser && norm(prefilledUser.username) === norm(targetUser)) {
            return prefilledUser.username;
        }
        const stillValid = eligibleUsers.some((u) => norm(u.username) === norm(targetUser));
        return stillValid ? targetUser : "";
    }, [eligibleUsers, lockTargetUser, prefilledUser, targetUser]);

    const selectedUserLabel = useMemo(() => {
        const selectedUser = eligibleUsers.find((user) => norm(user.username) === norm(effectiveTargetUser));
        return selectedUser ? userDisplayLabel(selectedUser) : "";
    }, [eligibleUsers, effectiveTargetUser]);
    const selectedRealmLabel = useMemo(() => {
        const selectedRealm = realmPickerOptions.find((realm) => realm.value === realmId);
        return selectedRealm?.label ?? "";
    }, [realmPickerOptions, realmId]);
    const selectedRoleLabel = useMemo(() => {
        const selectedRoleOption = rolePickerOptions.find((role) => role.value === roleRequested);
        return selectedRoleOption?.label ?? "";
    }, [rolePickerOptions, roleRequested]);
    const userPickerOptions = useMemo<SearchableComboboxOption[]>(
        () => eligibleUsers.map((user) => ({ value: user.username, label: userDisplayLabel(user) })),
        [eligibleUsers]
    );

    const requiresTimeBoundAccess = useMemo(
        () => TIME_BOUND_REQUIRED_ROLES.includes(roleRequested),
        [roleRequested]
    );
    const selectedSameRole = Boolean(currentRoleId) && roleRequested === currentRoleId;

    const canSave = useMemo(() => {
        if (!realmName.trim()) return false;
        if (!realmId.trim()) return false;
        if (!effectiveTargetUser.trim()) return false;
        if (!roleRequested.trim()) return false;
        if (currentRoleId && roleRequested === currentRoleId) return false;
        if (!justification.trim()) return false;
        if (requiresTimeBoundAccess && !timeBound) return false;
        if (timeBound && startDate && startDate < minDate) return false;
        if (timeBound && (!startDate || !endDate)) return false;
        if (timeBound && startDate && endDate && startDate > endDate) return false;
        return true;
    }, [
        realmName,
        realmId,
        effectiveTargetUser,
        roleRequested,
        currentRoleId,
        justification,
        requiresTimeBoundAccess,
        timeBound,
        startDate,
        endDate,
        minDate,
    ]);

    useEffect(() => {
        if (requiresTimeBoundAccess && !timeBound) {
            setTimeBound(true);
        }
    }, [requiresTimeBoundAccess, timeBound]);

    return (
        <div
            className="createAccessModal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    closeSafely();
                }
            }}
        >
            <div className="kc-modal">
                <div className="kc-modal-header">
                    <div className="createAccessModal-headerRow">
                        <div>
                            <div className="createAccessModal-title">New Realm Access Request</div>
                            <div className="createAccessModal-subtitle">
                                Create a draft request (you can submit it after).
                            </div>
                        </div>

                        <button
                            className="kc-btn kc-btn-ghost"
                            onClick={() => {
                                closeSafely();
                            }}
                            aria-label="Close"
                            type="button"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="kc-modal-body">
                    {error && (
                        <div className="createAccessModal-errorCard">
                            <div className="createAccessModal-errorTitle">Fix this</div>
                            <div className="createAccessModal-errorText">{error}</div>
                        </div>
                    )}

                    <div className="createAccessModal-grid">
                        <Field label="Realm">
                            <SearchableCombobox
                                value={realmId}
                                displayValue={selectedRealmLabel}
                                options={realmPickerOptions}
                                onChange={(selectedValue) => {
                                    const selectedRealm = realmPickerOptions.find((realm) => realm.value === selectedValue);
                                    setRealmId(selectedValue);
                                    setRealmName(selectedRealm?.label ?? "");
                                    setTargetUser("");
                                }}
                                placeholder="Select a realm"
                                noResultsText="No matching realms"
                                clearable={!lockRealm}
                                disabled={lockRealm}
                            />
                        </Field>

                        <Field label="User">
                            <SearchableCombobox
                                value={effectiveTargetUser}
                                displayValue={selectedUserLabel}
                                options={userPickerOptions}
                                onChange={(selectedValue) => setTargetUser(selectedValue)}
                                placeholder={!realmId.trim() ? "Enter/select realm first" : "Search user by name..."}
                                noResultsText="No matching users"
                                clearable={!lockTargetUser && !!realmId.trim()}
                                disabled={lockTargetUser || !realmId.trim()}
                            />
                        </Field>

                        <Field label="Role Requested">
                            <SearchableCombobox
                                value={roleRequested}
                                displayValue={selectedRoleLabel}
                                options={rolePickerOptions}
                                onChange={(selectedValue) => {
                                    if ((ROLES as readonly string[]).includes(selectedValue)) {
                                        setRoleRequested(selectedValue as Role);
                                    }
                                }}
                                placeholder="Select a role"
                                noResultsText="No matching roles"
                                disabled={lockRole}
                            />
                        </Field>
                    </div>

                    {selectedSameRole ? (
                        <div className="createAccessModal-warnCard">
                            This user already has <b>{ROLE_LABELS[currentRoleId] ?? currentRoleId}</b>. Select a different role to request a change.
                        </div>
                    ) : null}
                    {lockRole ? (
                        <div className="createAccessModal-inlineNote">
                            No alternative realm roles are available for this user in the current workflow.
                        </div>
                    ) : null}

                    <Field label="Justification">
                        <textarea
                            className="kc-input createAccessModal-textarea"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Why is access needed? What work will be done?"
                            rows={4}
                        />
                    </Field>

                    <div className="createAccessModal-checkboxRow">
                        <input
                            type="checkbox"
                            checked={timeBound}
                            onChange={(e) => setTimeBound(e.target.checked)}
                            className="createAccessModal-checkbox"
                            id="timeBound"
                            disabled={requiresTimeBoundAccess}
                        />
                        <label htmlFor="timeBound" className="createAccessModal-checkboxLabel">
                            Time-bound access
                        </label>
                        <span className="createAccessModal-checkboxHelp">
                            {requiresTimeBoundAccess ? "(required for this role)" : "(recommended for elevated roles)"}
                        </span>
                    </div>

                    {timeBound && (
                        <div className="createAccessModal-grid">
                            <Field label="Start Date">
                                <input
                                    className="kc-input"
                                    type="date"
                                    min={minDate}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Field>
                            <Field label="End Date">
                                <input
                                    className="kc-input"
                                    type="date"
                                    min={startDate || minDate}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Field>
                        </div>
                    )}
                </div>

                <div className="kc-modal-footer">
                    <button
                        className="kc-btn kc-btn-ghost"
                        onClick={() => {
                            closeSafely();
                        }}
                        type="button"
                    >
                        Cancel
                    </button>

                    <button
                        className="kc-btn kc-btn-primary"
                        disabled={!canSave || saving}
                        type="button"
                        onClick={async () => {
                            setError(null);

                            if (timeBound && startDate && startDate < minDate) {
                                setError("Start date cannot be earlier than today.");
                                return;
                            }

                            if (timeBound && startDate && endDate && startDate > endDate) {
                                setError("End date must be after start date.");
                                return;
                            }

                            setSaving(true);
                            try {
                                const req = await onCreate({
                                    realmId,
                                    realmName,
                                    targetUser: effectiveTargetUser,
                                    roleRequested,
                                    justification,
                                    timeBound,
                                    startDate,
                                    endDate,
                                    requester,
                                });

                                onCreated(req);
                                allowNextNavigation();
                                reset();
                                onClose();
                            } catch (err) {
                                setError(getFriendlyCreateError(err, currentRoleId));
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        {saving ? "Creating..." : "Create Draft"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="createAccessModal-field">
            <div className="createAccessModal-fieldLabel">{label}</div>
            {children}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SearchablePicker({
    value,
    displayValue,
    query,
    setQuery,
    options,
    open,
    setOpen,
    onSelect,
    placeholder,
    noResultsText,
    clearable = false,
    disabled = false,
}: {
    value: string;
    displayValue: string;
    query: string;
    setQuery: (value: string) => void;
    options: PickerOption[];
    open: boolean;
    setOpen: (value: boolean) => void;
    onSelect: (option: PickerOption) => void;
    placeholder: string;
    noResultsText: string;
    clearable?: boolean;
    disabled?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return options;
        return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
    }, [options, query]);

    const showClear = clearable && !disabled && !!value && !query && hovered && focused;

    return (
        <div
            style={{ position: "relative" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <input
                className="kc-input"
                type="text"
                value={query || displayValue}
                placeholder={placeholder}
                disabled={disabled}
                style={showClear ? { paddingRight: 36 } : undefined}
                onFocus={() => {
                    setFocused(true);
                    setOpen(true);
                }}
                onChange={(e) => {
                    const typedValue = e.target.value;
                    setQuery(typedValue);
                    const exactMatch = options.find((option) => option.label === typedValue);
                    if (exactMatch) {
                        onSelect(exactMatch);
                    }
                    setOpen(true);
                }}
                onBlur={() => {
                    setFocused(false);
                    setQuery("");
                    window.setTimeout(() => setOpen(false), 120);
                }}
            />

            {showClear ? (
                <button
                    type="button"
                    aria-label="Clear selection"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        onSelect({ value: "", label: "" });
                        setQuery("");
                        setOpen(false);
                    }}
                    style={{
                        position: "absolute",
                        top: "50%",
                        right: 10,
                        transform: "translateY(-50%)",
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        border: "none",
                        background: "rgba(15,23,42,0.08)",
                        color: "#475569",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.9rem",
                        lineHeight: 1,
                        padding: 0,
                    }}
                >
                    ×
                </button>
            ) : null}

            {open && !disabled ? (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        maxHeight: 220,
                        overflowY: "auto",
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 12,
                        boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                        zIndex: 20,
                    }}
                >
                    {filteredOptions.length === 0 ? (
                        <div style={{ padding: "10px 12px", fontSize: "0.875rem", color: "#6b7280" }}>
                            {noResultsText}
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onSelect(option);
                                    setQuery("");
                                    setOpen(false);
                                }}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    border: "none",
                                    background: value === option.value ? "#eff6ff" : "#fff",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    color: "#1f2937",
                                }}
                            >
                                {option.label}
                            </button>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}