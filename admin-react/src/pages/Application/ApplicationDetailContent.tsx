import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Copy, Globe, Key, Layers, RotateCw, Shield } from "lucide-react";
import { appsApi, type RotateClientSecretResponse } from "../../services/appsApi";
import { authApi } from "../../services/authApi";
import { governanceApi } from "../../services/governanceApi";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog, { type ConfirmState } from "../Realms/ConfirmDialog";
import { buildAppDeactivationApprovalPayload } from "../governance/approvalPayloads";
import { formatFull, safeDate } from "./applicationColumns";
import type { ApplicationRow } from "./applicationTypes";

const monoStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
    <div className="appDetail-row">
        <span className="appDetail-rowLabel">{label}</span>
        <span className={`appDetail-rowValue${mono ? " appDetail-rowValueMono" : ""}`} style={mono ? monoStyle : undefined}>
            {value}
        </span>
    </div>
);

type ApplicationDetailContentProps = {
    app: ApplicationRow;
    onBack?: () => void;
    onStatusChanged?: (appId: string, enabled: boolean, updatedAt?: string) => void;
    onSecretRotated?: (appId: string, result: RotateClientSecretResponse) => void;
    isSuperAdmin?: boolean;
};

const ApplicationDetailContent: React.FC<ApplicationDetailContentProps> = ({ app, onBack, onStatusChanged, onSecretRotated, isSuperAdmin = false }) => {
    const { pushToast } = useToast();
    const updatedAt = safeDate(app.updatedAt);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        open: false,
        title: "",
    });
    const [rotatedSecret, setRotatedSecret] = useState<RotateClientSecretResponse | null>(null);

    const impactDetails = useMemo(() => {
        const details = [
            `Linked realms: ${app.linkedRealmCount ?? 0}`,
            `Users with access: ${app.accessUserCount ?? 0}`,
        ];

        if (app.ownerRealm) details.push(`Owner realm: ${app.ownerRealm}`);
        if (app.redirectUris?.length) details.push(`Redirect URIs configured: ${app.redirectUris.length}`);
        if (app.postLogoutRedirectUris?.length) details.push(`Post logout redirect URIs: ${app.postLogoutRedirectUris.length}`);
        return details;
    }, [app]);

    const closeConfirm = () => setConfirmState({ open: false, title: "" });

    const copyRotatedSecret = async () => {
        if (!rotatedSecret?.clientSecret) return;
        await navigator.clipboard.writeText(rotatedSecret.clientSecret);
        pushToast("Client secret copied", "success");
    };

    const openRotateSecretConfirm = () => {
        setConfirmState({
            open: true,
            title: "Rotate client secret",
            message: `Rotating ${app.name}'s OAuth client secret will create a new secret and keep the previous secret valid temporarily.`,
            details: [
                "The new secret is shown once only.",
                "Update the relying app server before the previous secret expires.",
                "Do not paste this secret into frontend code or browser storage.",
            ],
            confirmText: "Rotate secret",
            cancelText: "Cancel",
            danger: true,
            confirmLabel: `Type "${app.clientId}" to confirm`,
            confirmMatchText: app.clientId,
            confirmHelperText: "This prevents accidental rotation of the wrong relying client.",
            requireJustification: true,
            justificationLabel: "Why are you rotating this secret?",
            justificationHelperText: "This reason will be recorded in the audit trail.",
            justificationPlaceholder: "Scheduled rotation, suspected exposure, or onboarding a new deployment",
            onConfirm: async ({ justification }) => {
                const result = await appsApi.rotateClientSecret(app.id, {
                    previousSecretGraceDays: 7,
                    reason: justification,
                });
                setRotatedSecret(result);
                onSecretRotated?.(app.id, result);
                pushToast("Client secret rotated", "success");
            },
        });
    };

    const openDeactivateConfirm = () => {
        setConfirmState({
            open: true,
            title: isSuperAdmin ? "Deactivate application" : "Request application deactivation",
            message: isSuperAdmin
                ? `Deactivating ${app.name} will disable access to this client for assigned users until it is re-enabled.`
                : `Submit a super admin approval request to deactivate ${app.name}.`,
            details: impactDetails,
            confirmText: isSuperAdmin ? "Deactivate application" : "Submit approval request",
            cancelText: "Cancel",
            danger: true,
            confirmLabel: isSuperAdmin ? `Type "${app.name}" to confirm` : `Type "${app.name}" to confirm this approval request`,
            confirmMatchText: app.name,
            confirmHelperText: isSuperAdmin
                ? "This helps prevent accidental deactivation of a production client."
                : "This request will be routed to a super admin for review.",
            requirePassword: isSuperAdmin,
            passwordLabel: isSuperAdmin ? "Re-enter your password" : undefined,
            passwordHelperText: isSuperAdmin ? "Use your current admin password to confirm this high-impact change." : undefined,
            requireJustification: true,
            justificationLabel: isSuperAdmin ? "Why are you deactivating this application?" : "Why are you requesting deactivation?",
            justificationHelperText: "This reason will be recorded in the audit trail.",
            justificationPlaceholder: isSuperAdmin ? "Enter the business reason for deactivation" : "Enter the business reason for this approval request",
            onConfirm: async ({ password, justification }) => {
                if (isSuperAdmin) {
                    await authApi.confirmPassword(password ?? "");

                    const result = await appsApi.setStatus(app.id, { status: "Disabled", confirmationMode: "password_reentry", reason: justification });
                    onStatusChanged?.(app.id, result.enabled, result.updatedAt);
                    return;
                }

                await governanceApi.createApproval({
                    entityType: "application",
                    entityId: app.id,
                    entityName: app.name,
                    action: "deactivate",
                    reason: justification,
                    details: `Deactivation requested for application ${app.name}`,
                    payloadJson: JSON.stringify(
                        buildAppDeactivationApprovalPayload({
                            appName: app.name,
                            ownerRealm: app.ownerRealm ?? null,
                            linkedRealmCount: app.linkedRealmCount ?? 0,
                            accessUserCount: app.accessUserCount ?? 0,
                            redirectUriCount: app.redirectUris?.length ?? 0,
                            postLogoutRedirectUriCount: app.postLogoutRedirectUris?.length ?? 0,
                        })
                    ),
                });
                pushToast("Deactivation request submitted for super admin approval", "success");
            },
        });
    };

    const handleActivate = async () => {
        const result = await appsApi.setStatus(app.id, { status: "Enabled", confirmationMode: "admin_action" });
        onStatusChanged?.(app.id, result.enabled, result.updatedAt);
    };

    return (
        <>
        <div className="appDetail-root">
            <div className="appDetail-header">
                <div className="appDetail-headerMain">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="appDetail-backButton"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    <div>
                        <div className="appDetail-title">{app.name}</div>
                        <div className="appDetail-pillRow">
                            <span className="pill pill-info">{app.authMethod.toUpperCase()}</span>
                            <span className={`pill ${app.status === "Enabled" ? "pill-success" : "pill-error"}`}>
                                {app.status}
                            </span>
                            <span className={`pill ${app.publicClient ? "pill-warn" : "pill-neutral"}`}>
                                {app.publicClient ? "Public Client" : "Confidential Client"}
                            </span>
                            <span className="pill pill-neutral appDetail-monoPill">
                                {app.clientId}
                            </span>
                            {app.ownerRealm && <span className="pill pill-neutral">{app.ownerRealm}</span>}
                        </div>
                    </div>
                </div>

                <div className="appDetail-headerActions">
                    {!app.publicClient && (
                        <button
                            type="button"
                            className="kc-btn kc-btn-ghost"
                            onClick={openRotateSecretConfirm}
                        >
                            <RotateCw size={16} /> Rotate secret
                        </button>
                    )}
                    {app.status === "Enabled" ? (
                        <button
                            type="button"
                            className="kc-btn kc-btn-danger"
                            onClick={openDeactivateConfirm}
                        >
                            <AlertTriangle size={16} /> Deactivate
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="kc-btn kc-btn-primary"
                            onClick={() => { void handleActivate(); }}
                        >
                            Activate
                        </button>
                    )}
                </div>
            </div>

            <div className="appDetail-grid">
                <div className="appDetail-card">
                    <div className="appDetail-cardTitle">
                        <Key size={16} /> Client Basics
                    </div>
                    <Row label="Client ID" value={app.clientId} mono />
                    <Row label="Auth Method" value={app.authMethod.toUpperCase()} />
                    <Row label="Status" value={app.status} />
                    <Row label="Client Type" value={app.publicClient ? "Public" : "Confidential"} />
                    <Row label="Client Secret" value={app.publicClient ? "Not required" : app.clientSecretMasked || "Configured"} mono />
                    <Row label="Secret Storage" value={app.clientSecretStorage || "Database"} />
                    <Row label="Secret Rotated" value={app.clientSecretRotatedAtUtc ? formatFull(safeDate(app.clientSecretRotatedAtUtc) ?? new Date(app.clientSecretRotatedAtUtc)) : "-"} />
                    <Row label="Previous Secret Expires" value={app.previousClientSecretExpiresAtUtc ? formatFull(safeDate(app.previousClientSecretExpiresAtUtc) ?? new Date(app.previousClientSecretExpiresAtUtc)) : "-"} />
                    <Row label="Last Updated" value={updatedAt ? formatFull(updatedAt) : "-"} />
                </div>

                <div className="appDetail-card">
                    <div className="appDetail-cardTitle">
                        <Globe size={16} /> URLs
                    </div>
                    <Row label="Root URL" value={app.rootUrl || "-"} mono />
                    <Row label="Base URL" value={app.baseUrl || "-"} mono />
                    <Row label="Admin URL" value={app.adminUrl || "-"} mono />
                </div>

                <div className="appDetail-card">
                    <div className="appDetail-cardTitle">
                        <Layers size={16} /> Redirect URIs
                    </div>
                    <div className="appDetail-list">
                        {(app.redirectUris?.length ? app.redirectUris : ["-"]).slice(0, 6).map((uri) => (
                            <div key={uri} className="appDetail-listItem appDetail-listItemMono" style={monoStyle}>
                                {uri}
                            </div>
                        ))}
                        {(app.redirectUris?.length ?? 0) > 6 && <div className="appDetail-ellipsis">...</div>}
                    </div>
                </div>
                <div className="appDetail-card">
                    <div className="appDetail-cardTitle">
                        <Layers size={16} /> Post Logout Redirect URIs
                    </div>
                    <div className="appDetail-list">
                        {(app.postLogoutRedirectUris?.length ? app.postLogoutRedirectUris : ["-"]).slice(0, 6).map((uri) => (
                            <div key={uri} className="appDetail-listItem appDetail-listItemMono" style={monoStyle}>
                                {uri}
                            </div>
                        ))}
                        {(app.postLogoutRedirectUris?.length ?? 0) > 6 && <div className="appDetail-ellipsis">...</div>}
                    </div>
                </div>
                <div className="appDetail-card">
                    <div className="appDetail-cardTitle">
                        <Shield size={16} /> Web Origins
                    </div>
                    <div className="appDetail-list">
                        {(app.webOrigins?.length ? app.webOrigins : ["-"]).slice(0, 6).map((origin) => (
                            <div key={origin} className="appDetail-listItem appDetail-listItemMono" style={monoStyle}>
                                {origin}
                            </div>
                        ))}
                        {(app.webOrigins?.length ?? 0) > 6 && <div className="appDetail-ellipsis">...</div>}
                    </div>
                </div>

                {app.description && (
                    <div className="appDetail-card appDetail-cardWide">
                        <div className="appDetail-cardTitle">
                            <Shield size={16} /> Description
                        </div>
                        <div className="appDetail-description">{app.description}</div>
                    </div>
                )}
            </div>
        </div>
        <ConfirmDialog state={confirmState} onClose={closeConfirm} />
        {rotatedSecret && (
            <div
                className="secretResultOverlay"
                role="dialog"
                aria-modal="true"
                aria-label="Client secret rotated"
            >
                <div className="secretResultModal">
                    <div className="secretResultHeader">
                        <div>
                            <div className="secretResultEyebrow">Client secret rotated</div>
                            <div className="secretResultTitle">{rotatedSecret.clientId}</div>
                        </div>
                        <button type="button" className="kc-btn kc-btn-ghost" onClick={() => setRotatedSecret(null)}>
                            Close
                        </button>
                    </div>

                    <div className="secretResultWarning">
                        Store this secret now. Casper will not show it again.
                    </div>

                    <div className="secretResultSecret">
                        <code>{rotatedSecret.clientSecret}</code>
                        <button type="button" className="kc-btn kc-btn-primary" onClick={() => void copyRotatedSecret()}>
                            <Copy size={16} /> Copy
                        </button>
                    </div>

                    <div className="secretResultMeta">
                        <Row label="Storage" value={rotatedSecret.clientSecretStorage} />
                        <Row label="Rotated" value={formatFull(safeDate(rotatedSecret.rotatedAtUtc) ?? new Date(rotatedSecret.rotatedAtUtc))} />
                        <Row label="Previous Secret Expires" value={rotatedSecret.previousClientSecretExpiresAtUtc ? formatFull(safeDate(rotatedSecret.previousClientSecretExpiresAtUtc) ?? new Date(rotatedSecret.previousClientSecretExpiresAtUtc)) : "-"} />
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default ApplicationDetailContent;