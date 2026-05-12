import React from "react";
import { KeyRound, Shield, Tag } from "lucide-react";

import type { RealmRole } from "./usersPageTypes";

interface RoleDetailProps {
  role: RealmRole;
}

const RoleDetailContent: React.FC<RoleDetailProps> = ({ role }) => {
  const permissionCount = role.permissions.length;
  const roleCategory = role.name.toLowerCase().includes("admin")
    ? "Administrative"
    : role.name.toLowerCase().includes("audit")
      ? "Audit"
      : role.name.toLowerCase().includes("verify")
        ? "Verification"
        : "Standard";

  return (
    <div className="kc-roleDetail">
      <div className="kc-roleDetailHero">
        <div className="kc-roleDetailHeading">
          <div className="kc-roleDetailIcon">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="kc-roleDetailTitle">{role.name}</h2>
            <p className="kc-roleDetailSubtitle">
              Review the role classification and assigned permissions for this access profile.
            </p>
          </div>
        </div>
      </div>

      <div className="kc-roleDetailStats">
        <div className="kc-roleDetailStat">
          <span className="kc-roleDetailStatLabel">Role ID</span>
          <span className="kc-roleDetailStatValue">{role.id}</span>
        </div>
        <div className="kc-roleDetailStat">
          <span className="kc-roleDetailStatLabel">Category</span>
          <span className="kc-roleDetailStatValue">{roleCategory}</span>
        </div>
        <div className="kc-roleDetailStat">
          <span className="kc-roleDetailStatLabel">Permissions</span>
          <span className="kc-roleDetailStatValue">{permissionCount}</span>
        </div>
      </div>

      <div className="kc-roleDetailCard">
        <div className="kc-roleDetailSectionHeader">
          <div className="kc-roleDetailSectionTitleWrap">
            <KeyRound size={16} />
            <h3 className="kc-roleDetailSectionTitle">Assigned Permissions</h3>
          </div>
          <span className="kc-roleDetailSectionMeta">
            {permissionCount} {permissionCount === 1 ? "permission" : "permissions"}
          </span>
        </div>

        {permissionCount === 0 ? (
          <div className="kc-roleDetailEmpty">
            This role does not currently expose any permissions.
          </div>
        ) : (
          <div className="kc-roleDetailPermissionList">
            {role.permissions.map((permission) => (
              <div key={permission} className="kc-roleDetailPermissionItem">
                <Tag size={14} />
                <span>{permission}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleDetailContent;