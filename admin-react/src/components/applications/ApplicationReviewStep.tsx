import React from "react";
import type { RegisterApplicationForm } from "../../types/applicationRegistration.types";

interface Props {
  form: RegisterApplicationForm;
  realmLabel?: string;
}

const TYPE_LABELS: Record<RegisterApplicationForm["basics"]["applicationType"], string> = {
  web: "Web App",
  mobile: "Mobile App",
  spa: "Single-Page App",
  backend: "Backend Service",
  m2m: "Machine-to-Machine",
};

const ENVIRONMENT_LABELS: Record<RegisterApplicationForm["basics"]["environment"], string> = {
  dev: "Development",
  staging: "Staging",
  prod: "Production",
};

const CRITICALITY_LABELS: Record<RegisterApplicationForm["basics"]["criticality"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const CLIENT_TYPE_LABELS: Record<RegisterApplicationForm["auth"]["clientType"], string> = {
  public: "Public",
  confidential: "Confidential",
};

const ReviewRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="kc-reviewRow">
    <div className="kc-reviewLabel">{label}</div>
    <div className="kc-reviewValue">{value || "-"}</div>
  </div>
);

const ReviewList: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="kc-reviewList">
    {items.length ? items.map((item) => <div key={item} className="kc-reviewListItem">{item}</div>) : "-"}
  </div>
);

const ApplicationReviewStep: React.FC<Props> = ({ form, realmLabel }) => {
  return (
    <div className="kc-formSection">
      <div className="kc-sectionHeader">
        <h3>Review Application Registration</h3>
        <p>Confirm the details before submitting for review.</p>
      </div>

      <div className="kc-reviewGrid">
        <div className="kc-reviewCard">
          <h4>Application Basics</h4>
          <ReviewRow label="Application Name" value={form.basics.name} />
          <ReviewRow label="Description" value={form.basics.description} />
          <ReviewRow label="Realm" value={realmLabel} />
          <ReviewRow label="Type" value={TYPE_LABELS[form.basics.applicationType]} />
          <ReviewRow label="Owner Team" value={form.basics.ownerTeam} />
          <ReviewRow label="Owner Email" value={form.basics.ownerEmail} />
          <ReviewRow label="Environment" value={ENVIRONMENT_LABELS[form.basics.environment]} />
          <ReviewRow label="Criticality" value={CRITICALITY_LABELS[form.basics.criticality]} />
          <ReviewRow label="Internet Facing" value={form.basics.internetFacing ? "Yes" : "No"} />
        </div>

        <div className="kc-reviewCard">
          <h4>Authentication</h4>
          <ReviewRow label="Protocol" value={form.auth.protocol.toUpperCase()} />
          <ReviewRow label="Client ID" value={form.auth.clientId} />
          <ReviewRow label="Client Type" value={CLIENT_TYPE_LABELS[form.auth.clientType]} />
          <ReviewRow label="Grant Types" value={<ReviewList items={form.auth.grantTypes} />} />
          <ReviewRow label="Redirect URIs" value={<ReviewList items={form.auth.redirectUris} />} />
          <ReviewRow label="Post Logout Redirect URIs" value={<ReviewList items={form.auth.postLogoutRedirectUris} />} />
          <ReviewRow label="Web Origins" value={<ReviewList items={form.auth.webOrigins} />} />
          <ReviewRow label="Base URL" value={form.auth.baseUrl} />
          <ReviewRow label="Admin URL" value={form.auth.adminUrl} />
        </div>

        <div className="kc-reviewCard">
          <h4>Security</h4>
          <ReviewRow label="Require PKCE" value={form.security.requirePkce ? "Yes" : "No"} />
          <ReviewRow label="Require MFA" value={form.security.requireMfa ? "Yes" : "No"} />
          <ReviewRow label="Allow Refresh Tokens" value={form.security.allowRefreshToken ? "Yes" : "No"} />
          <ReviewRow label="Allow Wildcard Redirects" value={form.security.allowWildcardRedirects ? "Yes" : "No"} />
          <ReviewRow label="Access Token Lifetime" value={`${form.security.accessTokenMinutes} mins`} />
          <ReviewRow label="Refresh Token Lifetime" value={`${form.security.refreshTokenHours} hours`} />
          <ReviewRow label="Session Timeout" value={`${form.security.sessionTimeoutMinutes} mins`} />
          <ReviewRow label="Allowed Roles" value={<ReviewList items={form.security.allowedRoles} />} />
          <ReviewRow label="Allowed User Types" value={<ReviewList items={form.security.allowedUserTypes} />} />
          <ReviewRow label="Allowed Realms" value={<ReviewList items={form.security.allowedRealms} />} />
          <ReviewRow label="Default Scopes" value={<ReviewList items={form.security.scopesDefault} />} />
          <ReviewRow label="Optional Scopes" value={<ReviewList items={form.security.scopesOptional} />} />
          <ReviewRow label="Custom Scopes" value={<ReviewList items={form.security.customScopes} />} />
        </div>
      </div>
    </div>
  );
};

export default ApplicationReviewStep;