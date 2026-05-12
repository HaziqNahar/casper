import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CloudUpload, Copy, Globe, KeyRound, LockKeyhole, RotateCw, Save, ShieldCheck, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ConfirmDialog, { type ConfirmState } from "../Realms/ConfirmDialog";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";
import { ROUTES } from "../../config/routes";
import { appsApi, type RotateClientSecretResponse } from "../../services/appsApi";
import { formatFull, safeDate } from "./applicationColumns";
import { mapAppToApplication } from "./Apps";
import type { ApplicationRow } from "./applicationTypes";

const monoClass = "oauthSettingsValue oauthSettingsValue--mono";

type OAuthSettingsForm = {
    redirectUris: string;
    postLogoutRedirectUris: string;
    webOrigins: string;
    rootUrl: string;
    baseUrl: string;
    adminUrl: string;
    reason: string;
};

const Field: React.FC<{ label: string; value?: string | number | null; mono?: boolean }> = ({ label, value, mono }) => (
    <div className="oauthSettingsField">
        <span className="oauthSettingsLabel">{label}</span>
        <span className={mono ? monoClass : "oauthSettingsValue"}>{value || "-"}</span>
    </div>
);

const UriList: React.FC<{ items?: string[]; emptyText: string }> = ({ items, emptyText }) => {
    const values = items?.length ? items : [];

    if (values.length === 0) {
        return <div className="oauthSettingsEmpty">{emptyText}</div>;
    }

    return (
        <div className="oauthSettingsUriList">
            {values.map((item) => (
                <code key={item} className="oauthSettingsUri">
                    {item}
                </code>
            ))}
        </div>
    );
};

const formatDate = (value?: string) => {
    const parsed = safeDate(value);
    return parsed ? formatFull(parsed) : "-";
};

const listToText = (items?: string[]) => (items?.length ? items.join("\n") : "");

const textToList = (value: string) =>
    Array.from(
        new Set(
            value
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
        )
    );

const formFromApp = (app: ApplicationRow): OAuthSettingsForm => ({
    redirectUris: listToText(app.redirectUris),
    postLogoutRedirectUris: listToText(app.postLogoutRedirectUris),
    webOrigins: listToText(app.webOrigins),
    rootUrl: app.rootUrl ?? "",
    baseUrl: app.baseUrl ?? "",
    adminUrl: app.adminUrl ?? "",
    reason: "",
});

const isAbsoluteHttpUrl = (value: string) => {
    try {
        const parsed = new URL(value.endsWith("/*") ? value.slice(0, -1) : value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

const validateOAuthSettingsForm = (form: OAuthSettingsForm) => {
    const errors: string[] = [];
    const redirectUris = textToList(form.redirectUris);
    const postLogoutRedirectUris = textToList(form.postLogoutRedirectUris);
    const webOrigins = textToList(form.webOrigins);

    if (redirectUris.length === 0) {
        errors.push("At least one redirect URI is required.");
    }

    redirectUris.forEach((uri) => {
        if (!isAbsoluteHttpUrl(uri)) errors.push(`Redirect URI is invalid: ${uri}`);
        if (uri.includes("*") && !uri.endsWith("/*")) errors.push(`Redirect URI wildcard must be trailing /*: ${uri}`);
    });

    postLogoutRedirectUris.forEach((uri) => {
        if (!isAbsoluteHttpUrl(uri)) errors.push(`Post logout redirect URI is invalid: ${uri}`);
        if (uri.includes("*") && !uri.endsWith("/*")) errors.push(`Post logout redirect URI wildcard must be trailing /*: ${uri}`);
    });

    webOrigins.forEach((origin) => {
        if (!isAbsoluteHttpUrl(origin)) {
            errors.push(`Web origin is invalid: ${origin}`);
            return;
        }

        const parsed = new URL(origin);
        if (parsed.pathname !== "/" || parsed.search || parsed.hash || origin.includes("*")) {
            errors.push(`Web origin must be origin-only: ${origin}`);
        }
    });

    [form.rootUrl, form.baseUrl, form.adminUrl].filter(Boolean).forEach((url) => {
        if (!isAbsoluteHttpUrl(url)) errors.push(`Entry URL is invalid: ${url}`);
        if (url.includes("*")) errors.push(`Entry URL cannot contain wildcards: ${url}`);
    });

    return { errors, redirectUris, postLogoutRedirectUris, webOrigins };
};

const ApplicationOAuthSettingsPage: React.FC = () => {
    const { appId } = useParams<{ appId: string }>();
    const navigate = useNavigate();
    const { totalApps, loading, error, refreshData } = useData();
    const { pushToast } = useToast();
    const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: "" });
    const [rotatedSecret, setRotatedSecret] = useState<RotateClientSecretResponse | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [form, setForm] = useState<OAuthSettingsForm>({
        redirectUris: "",
        postLogoutRedirectUris: "",
        webOrigins: "",
        rootUrl: "",
        baseUrl: "",
        adminUrl: "",
        reason: "",
    });

    const app = useMemo<ApplicationRow | null>(() => {
        const match = totalApps.find((candidate) => candidate.id === appId);
        return match ? mapAppToApplication(match) : null;
    }, [appId, totalApps]);

    useEffect(() => {
        if (!app || editing) return;
        setForm(formFromApp(app));
        setFormErrors([]);
    }, [app, editing]);

    const closeConfirm = () => setConfirmState({ open: false, title: "" });

    const updateForm = (field: keyof OAuthSettingsForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFormErrors([]);
    };

    const cancelEdit = () => {
        if (app) setForm(formFromApp(app));
        setEditing(false);
        setFormErrors([]);
    };

    const saveOAuthSettings = async () => {
        if (!app) return;

        const validation = validateOAuthSettingsForm(form);
        if (validation.errors.length > 0) {
            setFormErrors(validation.errors);
            return;
        }

        setSaving(true);
        try {
            await appsApi.updateOAuthSettings(app.id, {
                redirectUris: validation.redirectUris,
                postLogoutRedirectUris: validation.postLogoutRedirectUris,
                webOrigins: validation.webOrigins,
                rootUrl: form.rootUrl.trim() || null,
                baseUrl: form.baseUrl.trim() || null,
                adminUrl: form.adminUrl.trim() || null,
                reason: form.reason.trim() || undefined,
            });

            pushToast("OAuth settings updated", "success");
            setEditing(false);
            setFormErrors([]);
            await refreshData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to update OAuth settings.";
            setFormErrors([message]);
            pushToast("OAuth settings were not saved", "error");
        } finally {
            setSaving(false);
        }
    };

    const copyRotatedSecret = async () => {
        if (!rotatedSecret?.clientSecret) return;
        await navigator.clipboard.writeText(rotatedSecret.clientSecret);
        pushToast("Client secret copied", "success");
    };

    const openRotateSecretConfirm = () => {
        if (!app) return;

        setConfirmState({
            open: true,
            title: "Rotate OAuth client secret",
            message: `Rotating ${app.name}'s client secret will issue a new secret for relying app server-side token exchange.`,
            details: [
                "The new secret is shown once only.",
                "Update the relying app backend before the old secret expires.",
                "Do not store this secret in frontend code or browser storage.",
            ],
            confirmText: "Rotate secret",
            cancelText: "Cancel",
            danger: true,
            confirmLabel: `Type "${app.clientId}" to confirm`,
            confirmMatchText: app.clientId,
            confirmHelperText: "This prevents accidental rotation of the wrong OAuth client.",
            requireJustification: true,
            justificationLabel: "Reason",
            justificationHelperText: "This reason will be recorded in the audit trail.",
            justificationPlaceholder: "Scheduled rotation, suspected exposure, or new deployment",
            onConfirm: async ({ justification }) => {
                const result = await appsApi.rotateClientSecret(app.id, {
                    previousSecretGraceDays: 7,
                    reason: justification,
                });
                setRotatedSecret(result);
                pushToast("Client secret rotated", "success");
                void refreshData();
            },
        });
    };

    const openMoveSecretToAwsConfirm = () => {
        if (!app) return;

        const secretName = `casper/oauth-clients/${app.clientId}`;
        setConfirmState({
            open: true,
            title: "Move client secret to AWS Secrets Manager",
            message: `This will move ${app.name}'s existing client secret out of the database and into AWS Secrets Manager.`,
            details: [
                `AWS secret name: ${secretName}`,
                "The relying app backend should read this secret from AWS for token exchange.",
                "No new client secret is generated by this action.",
            ],
            confirmText: "Move to AWS",
            cancelText: "Cancel",
            danger: true,
            confirmLabel: `Type "${app.clientId}" to confirm`,
            confirmMatchText: app.clientId,
            confirmHelperText: "This prevents moving the wrong OAuth client secret.",
            requireJustification: true,
            justificationLabel: "Reason",
            justificationHelperText: "This reason will be recorded in the audit trail.",
            justificationPlaceholder: "Production hardening or migration to managed secret storage",
            onConfirm: async ({ justification }) => {
                await appsApi.moveClientSecretToAws(app.id, {
                    secretName,
                    reason: justification,
                });
                pushToast("Client secret moved to AWS Secrets Manager", "success");
                void refreshData();
            },
        });
    };

    if (loading) {
        return (
            <div className="oauthSettingsPage">
                <div className="kc-tabMessage">Loading OAuth client...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="oauthSettingsPage">
                <div className="kc-tabMessage kc-tabMessage--compact">Error: {error}</div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="oauthSettingsPage">
                <div className="kc-tabMessage kc-tabMessage--compact">
                    Application not found: <b>{appId ?? "(missing id)"}</b>
                </div>
            </div>
        );
    }

    const isAwsSecret = app.clientSecretStorage === "AwsSecretsManager";
    const recommendedSecretName = `casper/oauth-clients/${app.clientId}`;
    const activeSecretName = app.clientSecretSecretName || recommendedSecretName;
    const issuerHint = import.meta.env.VITE_CASPER_ISSUER || "http://localhost:60699";
    const relyingAppEnv = [
        `CASPER_ISSUER=${issuerHint}`,
        `CASPER_AUTHORIZE_URL=${issuerHint}/oauth2/authorize`,
        `CASPER_TOKEN_URL=${issuerHint}/oauth2/token`,
        `CASPER_JWKS_URL=${issuerHint}/.well-known/jwks.json`,
        `RELYING_APP_CLIENT_ID=${app.clientId}`,
        `RELYING_APP_REDIRECT_URI=${app.redirectUris?.[0] ?? "https://app.company.sg/casper/callback"}`,
        `RELYING_APP_SCOPE=openid`,
        `RELYING_APP_CLIENT_SECRET_SOURCE=${app.publicClient ? "none" : isAwsSecret ? "aws" : "env"}`,
        app.publicClient ? "" : `RELYING_APP_CLIENT_SECRET_AWS_SECRET_NAME=${activeSecretName}`,
    ]
        .filter(Boolean)
        .join("\n");

    return (
        <div className="oauthSettingsPage">
            <div className="oauthSettingsShell">
                <section className="oauthSettingsHero">
                    <div>
                        <button type="button" className="appDetail-backButton" onClick={() => navigate(ROUTES.APPS)}>
                            <ArrowLeft size={16} /> Back to applications
                        </button>
                        <div className="oauthSettingsEyebrow">OAuth client settings</div>
                        <h2 className="oauthSettingsTitle">{app.name}</h2>
                        <p className="oauthSettingsSubtitle">
                            Manage the relying app identity, redirect policy, and server-side client secret used for authorization-code token exchange.
                        </p>
                    </div>

                    <div className="oauthSettingsHeroActions">
                        <span className={`pill ${app.status === "Enabled" ? "pill-success" : "pill-error"}`}>{app.status}</span>
                        <span className={`pill ${app.publicClient ? "pill-warn" : "pill-neutral"}`}>
                            {app.publicClient ? "Public client" : "Confidential client"}
                        </span>
                        {editing ? (
                            <>
                                <button type="button" className="kc-btn kc-btn-ghost" onClick={cancelEdit} disabled={saving}>
                                    <X size={16} /> Cancel
                                </button>
                                <button type="button" className="kc-btn kc-btn-primary" onClick={() => void saveOAuthSettings()} disabled={saving}>
                                    <Save size={16} /> {saving ? "Saving..." : "Save changes"}
                                </button>
                            </>
                        ) : (
                            <button type="button" className="kc-btn kc-btn-ghost" onClick={() => setEditing(true)}>
                                Edit settings
                            </button>
                        )}
                        {!app.publicClient && (
                            <button type="button" className="kc-btn kc-btn-primary" onClick={openRotateSecretConfirm} disabled={saving}>
                                <RotateCw size={16} /> Rotate secret
                            </button>
                        )}
                    </div>
                </section>

                {formErrors.length > 0 && (
                    <div className="oauthSettingsErrors" role="alert">
                        {formErrors.map((item) => (
                            <div key={item}>{item}</div>
                        ))}
                    </div>
                )}

                <div className="oauthSettingsGrid">
                    <section className="oauthSettingsCard">
                        <div className="oauthSettingsCardTitle">
                            <KeyRound size={17} /> Client identity
                        </div>
                        <Field label="Client ID" value={app.clientId} mono />
                        <Field label="Protocol" value={app.authMethod.toUpperCase()} />
                        <Field label="Client Type" value={app.publicClient ? "Public" : "Confidential"} />
                        <Field label="Owner Realm" value={app.ownerRealm} />
                    </section>

                    <section className="oauthSettingsCard">
                        <div className="oauthSettingsCardTitle">
                            <LockKeyhole size={17} /> Secret management
                        </div>
                        <Field label="Current Secret" value={app.publicClient ? "Not required" : app.clientSecretMasked || "Configured"} mono />
                        <Field label="Storage" value={app.clientSecretStorage || "Database"} />
                        <Field label="AWS Secret Name" value={app.clientSecretSecretName} mono />
                        {!app.publicClient && !isAwsSecret && (
                            <Field label="Recommended AWS Secret Name" value={recommendedSecretName} mono />
                        )}
                        <Field label="Last Rotated" value={formatDate(app.clientSecretRotatedAtUtc)} />
                        <Field label="Previous Secret Expires" value={formatDate(app.previousClientSecretExpiresAtUtc)} />
                        {!app.publicClient && !isAwsSecret && (
                            <div className="oauthSettingsCardActions">
                                <button type="button" className="kc-btn kc-btn-primary" onClick={openMoveSecretToAwsConfirm} disabled={saving}>
                                    <CloudUpload size={16} /> Move to AWS Secrets Manager
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="oauthSettingsCard oauthSettingsCard--wide">
                        <div className="oauthSettingsCardTitle">
                            <Globe size={17} /> Redirect policy
                        </div>
                        {editing ? (
                            <div className="oauthSettingsEditStack">
                                <label className="oauthSettingsFormField">
                                    <span>Redirect URIs</span>
                                    <textarea
                                        className="oauthSettingsTextarea"
                                        rows={4}
                                        value={form.redirectUris}
                                        onChange={(event) => updateForm("redirectUris", event.target.value)}
                                    />
                                    <small>One URI per line. A trailing /* wildcard is allowed for redirect policies.</small>
                                </label>
                                <label className="oauthSettingsFormField">
                                    <span>Post logout redirect URIs</span>
                                    <textarea
                                        className="oauthSettingsTextarea"
                                        rows={3}
                                        value={form.postLogoutRedirectUris}
                                        onChange={(event) => updateForm("postLogoutRedirectUris", event.target.value)}
                                    />
                                </label>
                            </div>
                        ) : (
                            <>
                                <div className="oauthSettingsSectionLabel">Redirect URIs</div>
                                <UriList items={app.redirectUris} emptyText="No redirect URIs configured." />

                                <div className="oauthSettingsSectionLabel">Post logout redirect URIs</div>
                                <UriList items={app.postLogoutRedirectUris} emptyText="No post logout redirect URIs configured." />
                            </>
                        )}
                    </section>

                    <section className="oauthSettingsCard oauthSettingsCard--wide">
                        <div className="oauthSettingsCardTitle">
                            <KeyRound size={17} /> Relying app setup
                        </div>
                        <p className="oauthSettingsHelpText">
                            Use these values in the server-side relying app template. The browser should only start the redirect flow; client secret lookup and token
                            exchange belong on the relying app backend.
                        </p>
                        <div className="oauthSettingsInstructionGrid">
                            <Field label="Issuer" value={issuerHint} mono />
                            <Field label="Authorize endpoint" value="/oauth2/authorize" mono />
                            <Field label="Token endpoint" value="/oauth2/token" mono />
                            <Field label="JWKS endpoint" value="/.well-known/jwks.json" mono />
                            <Field label="Client ID" value={app.clientId} mono />
                            <Field label="Secret source" value={app.publicClient ? "Not required" : isAwsSecret ? "AWS Secrets Manager" : "Environment variable"} />
                            {!app.publicClient && <Field label="AWS Secret Name" value={activeSecretName} mono />}
                        </div>
                        <div className="oauthSettingsSectionLabel">Template environment</div>
                        <pre className="oauthSettingsCommandBlock">{relyingAppEnv}</pre>
                    </section>

                    <section className="oauthSettingsCard">
                        <div className="oauthSettingsCardTitle">
                            <ShieldCheck size={17} /> Browser origin policy
                        </div>
                        {editing ? (
                            <label className="oauthSettingsFormField">
                                <span>Web origins</span>
                                <textarea
                                    className="oauthSettingsTextarea"
                                    rows={4}
                                    value={form.webOrigins}
                                    onChange={(event) => updateForm("webOrigins", event.target.value)}
                                />
                                <small>Origins only, for example https://ops.company.sg. Do not include paths.</small>
                            </label>
                        ) : (
                            <UriList items={app.webOrigins} emptyText="No web origins configured." />
                        )}
                    </section>

                    <section className="oauthSettingsCard">
                        <div className="oauthSettingsCardTitle">
                            <ShieldCheck size={17} /> Operational footprint
                        </div>
                        <Field label="Linked Realms" value={app.linkedRealmCount ?? 0} />
                        <Field label="Users With Access" value={app.accessUserCount ?? 0} />
                        <Field label="Updated" value={formatDate(app.updatedAt)} />
                    </section>

                    <section className="oauthSettingsCard oauthSettingsCard--wide">
                        <div className="oauthSettingsCardTitle">
                            <Globe size={17} /> Application entry URLs
                        </div>
                        {editing ? (
                            <div className="oauthSettingsEditGrid">
                                <label className="oauthSettingsFormField">
                                    <span>Root URL</span>
                                    <input
                                        className="oauthSettingsInput"
                                        value={form.rootUrl}
                                        onChange={(event) => updateForm("rootUrl", event.target.value)}
                                        placeholder="https://app.company.sg"
                                    />
                                </label>
                                <label className="oauthSettingsFormField">
                                    <span>Base URL</span>
                                    <input
                                        className="oauthSettingsInput"
                                        value={form.baseUrl}
                                        onChange={(event) => updateForm("baseUrl", event.target.value)}
                                        placeholder="https://app.company.sg"
                                    />
                                </label>
                                <label className="oauthSettingsFormField">
                                    <span>Admin URL</span>
                                    <input
                                        className="oauthSettingsInput"
                                        value={form.adminUrl}
                                        onChange={(event) => updateForm("adminUrl", event.target.value)}
                                        placeholder="https://app.company.sg/admin"
                                    />
                                </label>
                                <label className="oauthSettingsFormField oauthSettingsFormField--wide">
                                    <span>Audit reason</span>
                                    <input
                                        className="oauthSettingsInput"
                                        value={form.reason}
                                        onChange={(event) => updateForm("reason", event.target.value)}
                                        placeholder="Why are these OAuth settings changing?"
                                    />
                                </label>
                            </div>
                        ) : (
                            <>
                                <Field label="Root URL" value={app.rootUrl} mono />
                                <Field label="Base URL" value={app.baseUrl} mono />
                                <Field label="Admin URL" value={app.adminUrl} mono />
                            </>
                        )}
                    </section>
                </div>
            </div>

            <ConfirmDialog state={confirmState} onClose={closeConfirm} />

            {rotatedSecret && (
                <div className="secretResultOverlay" role="dialog" aria-modal="true" aria-label="Client secret rotated">
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

                        <div className="secretResultWarning">Store this secret now. Casper will not show it again.</div>

                        <div className="secretResultSecret">
                            <code>{rotatedSecret.clientSecret}</code>
                            <button type="button" className="kc-btn kc-btn-primary" onClick={() => void copyRotatedSecret()}>
                                <Copy size={16} /> Copy
                            </button>
                        </div>

                        <div className="secretResultMeta">
                            <Field label="Storage" value={rotatedSecret.clientSecretStorage} />
                            <Field label="Rotated" value={formatDate(rotatedSecret.rotatedAtUtc)} />
                            <Field label="Previous Secret Expires" value={formatDate(rotatedSecret.previousClientSecretExpiresAtUtc)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationOAuthSettingsPage;