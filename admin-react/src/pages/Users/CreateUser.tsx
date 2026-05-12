import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../config/routes";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import CreateUserPanel from "./CreateUserPanel";
import { USER_TYPES_DATA } from "./usersPageData";

const LEAVE_MESSAGE = "Are you sure you want to leave? Your user changes will not be saved.";

const CreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDirty, setIsDirty] = useState(false);
  const { allowNextNavigation } = useUnsavedChangesGuard({
    when: isDirty,
    message: LEAVE_MESSAGE,
  });

  return (
    <div className="page-container">
      <div className="kcPageTop">
        <div className="kcPageTopLeft">
          <div className="kcPageTitle">Create User</div>
          <div className="kcPageSubtitle">Create a directory user with the current admin workflow.</div>
        </div>
      </div>

      <div className="glass-surface glass-surface--soft kc-mainCard createUser-pageCard">
        <CreateUserPanel
          userTypes={USER_TYPES_DATA}
          onDirtyChange={setIsDirty}
          onCancel={() => navigate(ROUTES.USERS)}
          onSave={() => {
            allowNextNavigation();
            navigate(ROUTES.USERS);
          }}
        />
      </div>
    </div>
  );
};

export default CreateUserPage;