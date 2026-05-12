import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../config/routes";
import { useData } from "../../context/DataContext";
import { appsApi } from "../../services/appsApi";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import ApplicationAuthStep from "../../components/applications/ApplicationAuthStep";
import ApplicationBasicsStep from "../../components/applications/ApplicationBasicsStep";
import ApplicationRegistrationStepper from "../../components/applications/ApplicationRegistrationStepper";
import ApplicationRegistrationSummaryCard from "../../components/applications/ApplicationRegistrationSummaryCard";
import ApplicationReviewStep from "../../components/applications/ApplicationReviewStep";
import ApplicationSecurityStep from "../../components/applications/ApplicationSecurityStep";
import type {
    RegisterApplicationForm,
    RegistrationStep,
} from "../../types/applicationRegistration.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidUrl = (value: string) => {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

const requiresRedirectUris = (applicationType: RegisterApplicationForm["basics"]["applicationType"]) =>
    applicationType === "web" || applicationType === "spa" || applicationType === "mobile";


const normalizeValues = (values: string[]) =>
    values.map((value) => value.trim()).filter((value) => value.length > 0);

const getBasicsStepError = (form: RegisterApplicationForm) => {
    if (!form.basics.name.trim()) return "Application name is required.";
    if (!form.basics.realmId.trim()) return "Select a realm before continuing.";
    if (!form.basics.ownerTeam.trim()) return "Owner team is required.";
    if (!form.basics.ownerEmail.trim()) return "Owner email is required.";
    if (!EMAIL_PATTERN.test(form.basics.ownerEmail.trim())) return "Enter a valid owner email address.";
    return null;
};

const getAuthStepError = (form: RegisterApplicationForm) => {
    if (!form.auth.clientId.trim()) return "Client ID is required.";
    if (form.auth.clientType === "confidential" && !form.auth.clientSecret.trim()) {
        return "Client secret is required for confidential clients.";
    }
    if (requiresRedirectUris(form.basics.applicationType) && form.auth.redirectUris.length === 0) {
        return "Add at least one redirect URI for this application type.";
    }
    if (form.auth.redirectUris.some((uri) => !isValidUrl(uri))) {
        return "Every redirect URI must be a valid absolute URL.";
    }
    if (form.auth.postLogoutRedirectUris.some((uri) => !isValidUrl(uri))) {
        return "Every post-logout redirect URI must be a valid absolute URL.";
    }
    if (form.auth.webOrigins.some((origin) => !isValidUrl(origin))) {
        return "Every web origin must be a valid absolute URL.";
    }
    if (form.auth.baseUrl.trim() && !isValidUrl(form.auth.baseUrl.trim())) {
        return "Base URL must be a valid absolute URL.";
    }
    if (form.auth.adminUrl.trim() && !isValidUrl(form.auth.adminUrl.trim())) {
        return "Admin URL must be a valid absolute URL.";
    }
    return null;
};

const getSecurityStepError = (form: RegisterApplicationForm) => {
    if (form.security.accessTokenMinutes <= 0) return "Access token lifetime must be greater than zero.";
    if (form.security.refreshTokenHours <= 0) return "Refresh token lifetime must be greater than zero.";
    if (form.security.sessionTimeoutMinutes <= 0) return "Session timeout must be greater than zero.";
    return null;
};

const DEFAULT_FORM: RegisterApplicationForm = {
    basics: {
        name: "",
        description: "",
        realmId: "",
        applicationType: "web",
        ownerTeam: "",
        ownerEmail: "",
        environment: "dev",
        criticality: "medium",
        internetFacing: false,
    },
    auth: {
        protocol: "oidc",
        clientId: "",
        clientType: "confidential",
        clientSecret: "",
        grantTypes: ["authorization_code", "refresh_token"],
        redirectUris: [],
        postLogoutRedirectUris: [],
        webOrigins: [],
        baseUrl: "",
        adminUrl: "",
    },
    security: {
        requirePkce: true,
        requireMfa: false,
        allowRefreshToken: true,
        allowWildcardRedirects: false,
        accessTokenMinutes: 15,
        refreshTokenHours: 12,
        sessionTimeoutMinutes: 30,
        allowedRoles: [],
        allowedUserTypes: [],
        allowedRealms: [],
        scopesDefault: ["openid", "profile", "email"],
        scopesOptional: [],
        customScopes: [],
    },
};

const LEAVE_MESSAGE = "Are you sure you want to leave? Your application registration changes will not be saved.";

const RegisterApplicationPage: React.FC = () => {
    const navigate = useNavigate();
    const { totalRealms, refreshData } = useData();
    const [step, setStep] = useState<RegistrationStep>(1);
    const [form, setForm] = useState<RegisterApplicationForm>(DEFAULT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(DEFAULT_FORM), [form]);
    const { allowNextNavigation } = useUnsavedChangesGuard({
        when: isDirty,
        message: LEAVE_MESSAGE,
    });

    const updateBasics = (basics: RegisterApplicationForm["basics"]) => {
        setStepError(null);
        setSubmitError(null);
        setForm((prev) => ({ ...prev, basics }));
    };

    const updateAuth = (auth: RegisterApplicationForm["auth"]) => {
        setStepError(null);
        setSubmitError(null);
        setForm((prev) => ({ ...prev, auth }));
    };

    const updateSecurity = (security: RegisterApplicationForm["security"]) => {
        setStepError(null);
        setSubmitError(null);
        setForm((prev) => ({ ...prev, security }));
    };

    const getCurrentStepError = (targetStep: RegistrationStep) => {
        switch (targetStep) {
            case 1:
                return getBasicsStepError(form);
            case 2:
                return getAuthStepError(form);
            case 3:
                return getSecurityStepError(form);
            default:
                return null;
        }
    };

    const nextStep = () => {
        const validationError = getCurrentStepError(step);
        if (validationError) {
            setStepError(validationError);
            return;
        }
        setStepError(null);
        setStep((current) => (current < 4 ? ((current + 1) as RegistrationStep) : current));
    };

    const prevStep = () => {
        setStepError(null);
        setStep((current) => (current > 1 ? ((current - 1) as RegistrationStep) : current));
    };

    const realmOptions = totalRealms.map((realm) => ({
        value: realm.id,
        label: realm.name,
    }));

    const selectedRealmLabel =
        realmOptions.find((realm) => realm.value === form.basics.realmId)?.label ?? "";

    const handleSubmit = async () => {
        const validationError = getBasicsStepError(form) ?? getAuthStepError(form) ?? getSecurityStepError(form);
        if (validationError) {
            setStepError(validationError);
            setSubmitError(null);
            return;
        }

        try {
            setSubmitting(true);
            setStepError(null);
            setSubmitError(null);
            const redirectUris = normalizeValues(form.auth.redirectUris);
            const postLogoutRedirectUris = normalizeValues(form.auth.postLogoutRedirectUris);
            const webOrigins = normalizeValues(form.auth.webOrigins);
            const baseUrl = form.auth.baseUrl.trim();
            const adminUrl = form.auth.adminUrl.trim();

            await appsApi.create({
                name: form.basics.name.trim(),
                clientId: form.auth.clientId.trim(),
                clientSecret: form.auth.clientSecret.trim() || undefined,
                redirectUris,
                postLogoutRedirectUris,
                webOrigins,
                protocol: form.auth.protocol,
                publicClient: form.auth.clientType === "public",
                rootUrl: baseUrl || undefined,
                baseUrl: baseUrl || undefined,
                adminUrl: adminUrl || undefined,
                realmId: form.basics.realmId || undefined,
                description: form.basics.description.trim() || undefined,
            });


            await refreshData();
            allowNextNavigation();
            navigate(ROUTES.APPS);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Failed to register application.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return <ApplicationBasicsStep value={form.basics} onChange={updateBasics} realmOptions={realmOptions} />;
            case 2:
                return (
                    <ApplicationAuthStep
                        value={form.auth}
                        appType={form.basics.applicationType}
                        onChange={updateAuth}
                    />
                );
            case 3:
                return <ApplicationSecurityStep value={form.security} onChange={updateSecurity} />;
            case 4:
                return <ApplicationReviewStep form={form} realmLabel={selectedRealmLabel} />;
            default:
                return null;
        }
    };

    return (
        <div className="page-container">
            <div className="kcPageTop">
                <div className="kcPageTopLeft">
                    <div className="kcPageTitle">Register Application</div>
                    <div className="kcPageSubtitle">
                        Register a new client application for SSO, redirect policy,
                        scopes, and governance review.
                    </div>
                </div>
            </div>

            <ApplicationRegistrationStepper currentStep={step} onStepClick={setStep} />

            <div className="kc-registerLayout">
                <div className="glass-surface glass-surface--soft kc-mainCard">
                    {renderStep()}

                    {(stepError || submitError) && (
                        <div className="kc-errorBanner">
                            {stepError ?? submitError}
                        </div>
                    )}

                    <div className="u-flex u-between u-center" style={{ marginTop: 24 }}>
                        <div>
                            {step > 1 && (
                                <button className="kc-btn kc-btn-ghost" onClick={prevStep}>
                                    Back
                                </button>
                            )}
                        </div>

                        <div className="u-flex u-gap-2">
                            {step < 4 && (
                                <button className="kc-btn kc-btn-primary" onClick={nextStep}>
                                    Continue
                                </button>
                            )}

                            {step === 4 && (
                                <button className="kc-btn kc-btn-success" onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? "Submitting..." : "Submit Application"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <ApplicationRegistrationSummaryCard
                    form={form}
                    currentStep={step}
                    realmLabel={selectedRealmLabel}
                />
            </div>
        </div>
    );
};

export default RegisterApplicationPage;