import React from "react";

import DataTable from "../../components/common/DataTable";
import { createUserTypeColumns } from "./usersPageColumns";
import type { UserTypeRow } from "./usersPageTypes";

interface UserTypesContentProps {
  loading: boolean;
  error: string | null;
  onRowClick: (role: UserTypeRow) => void;
  enabled2FAByType: Record<string, string[]>;
  onToggle2FA: (typeId: string, method: string) => void;
  filteredUserTypes: UserTypeRow[];
}

const UserTypesContent: React.FC<UserTypesContentProps> = ({
  loading,
  error,
  onRowClick,
  enabled2FAByType,
  onToggle2FA,
  filteredUserTypes,
}) => {
  const columns = React.useMemo(
    () => createUserTypeColumns(onRowClick, enabled2FAByType, onToggle2FA),
    [onRowClick, enabled2FAByType, onToggle2FA]
  );

  return (
    <div className="tab-table-container">
      <div className="tab-table-main">
        <div className="table-card kc-listTableCard">
          <DataTable<UserTypeRow>
            data={filteredUserTypes}
            columns={columns}
            keyField="id"
            onRowClick={onRowClick}
            loading={loading}
            error={error}
            searchable={true}
            searchPlaceholder="Search by user type, description..."
            paginated={true}
            pageSize={10}
            pageSizeOptions={[10, 25, 50]}
            striped={true}
            hoverable={true}
            stickyHeader={true}
            emptyMessage="No user types found"
            minHeight="100%"
          />
        </div>
      </div>

    </div>
  );
};

export default UserTypesContent;