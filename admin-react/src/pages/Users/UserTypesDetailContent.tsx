import React from "react";
import { ArrowLeft, Edit, LogIn, Shield, Trash2 } from "lucide-react";

import type { UserTypeRow } from "./usersPageTypes";

interface UserTypesDetailContentProps {
  usertype: UserTypeRow;
  onBack?: () => void;
  enabled2FAByType: Record<string, string[]>;
  onToggle2FA: (typeId: string, method: string) => void;
  filteredUserTypes: UserTypeRow[];
}

const UserTypesDetailContent: React.FC<UserTypesDetailContentProps> = ({
  usertype,
  onBack,
  enabled2FAByType,
  onToggle2FA,
}) => {
  const enabledSet = new Set(enabled2FAByType?.[usertype.id] ?? []);

  return (
    <div className="kc-detailPage">
      <div className="kc-detailHeader">
        <div className="kc-detailHeaderLeft">
          {onBack && (
            <button
              onClick={onBack}
              className="kc-btn kc-btn-ghost"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <div>
            <h2 className="kc-detailTitle">{usertype.title}</h2>
            <p className="kc-detailSubtitle">{usertype.desc}</p>
          </div>
        </div>

        <div className="kc-detailActions">
          <button
            className="kc-btn kc-btn-primary"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            className="kc-btn kc-btn-danger"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className="kc-detailGrid">
        <div className="kc-detailCard">
          <h3 className="kc-detailCardTitle">
            <Shield size={16} />
            Role Information
          </h3>

          <div className="kc-detailFieldStack">
            <div>
              <label className="kc-detailFieldLabel">Name</label>
              <p className="kc-detailFieldValue is-strong">{usertype.title}</p>
            </div>
            <div>
              <label className="kc-detailFieldLabel">Description</label>
              <p className="kc-detailFieldValue">
                {usertype.desc || "No description provided"}
              </p>
            </div>
          </div>
        </div>

        <div className="kc-detailCard">
          <h3 className="kc-detailCardTitle">
            <LogIn size={16} />
            Authentication
          </h3>

          <div className="kc-detailFieldStack">
            <div className="kc-detailTwoCol">
              <div>
                <label className="kc-detailFieldLabel">1FA</label>
                <p className="kc-detailFieldValue">{usertype.fa1}</p>
              </div>
              <div>
                <label className="kc-detailFieldLabel">2FA</label>
                <div className="fa2-stack kc-detailFieldOffset">
                  {(usertype.fa2 ?? []).map((method) => {
                    const enabled = enabledSet.has(method);
                    const isNote = /additional\s+email\s+otp/i.test(method);

                    return (
                      <button
                        key={method}
                        type="button"
                        className={["pill", isNote ? "pill-warn" : "pill-info", enabled ? "pill-on" : "pill-off", "pill-toggle"].join(" ")}
                        onClick={() => onToggle2FA(usertype.id, method)}
                        aria-pressed={enabled}
                        title={enabled ? "Click to disable" : "Click to enable"}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <label className="kc-detailFieldLabel">Use Case</label>
              <p className="kc-detailFieldValue">{usertype.useCase}</p>
            </div>
          </div>
        </div>

        <div className="kc-detailCard">
          <h3 className="kc-detailCardTitle">
            <Shield size={16} /> Permissions
          </h3>
        </div>
      </div>
    </div>
  );
};

export default UserTypesDetailContent;