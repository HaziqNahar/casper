import React from "react";

import DataTable from "../../components/common/DataTable";
import SearchableCombobox from "../../components/common/SearchableCombobox";
import { createRoleColumns } from "./usersPageColumns";
import type { RealmRole } from "./usersPageTypes";

interface RolesContentProps {
  roles: RealmRole[];
  loading: boolean;
  error: string | null;
  onRowClick: (role: RealmRole) => void;
  isFilterOpen: boolean;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  filteredRoles: RealmRole[];
}

const RolesContent: React.FC<RolesContentProps> = ({
  roles,
  loading,
  error,
  onRowClick,
  isFilterOpen,
  roleFilter,
  onRoleFilterChange,
  filteredRoles,
}) => {
  const columns = React.useMemo(() => createRoleColumns(onRowClick), [onRowClick]);

  const uniqueRoles = React.useMemo(() => {
    return [...new Set(roles.map((role) => role.name))];
  }, [roles]);

  return (
    <div className="tab-table-container has-side-filter">
      <div className="tab-table-main">
        <div className="table-card">
          <DataTable<RealmRole>
            data={filteredRoles}
            columns={columns}
            keyField="id"
            onRowClick={onRowClick}
            loading={loading}
            error={error}
            searchable={true}
            searchPlaceholder="Search by role name..."
            paginated={true}
            pageSize={10}
            pageSizeOptions={[10, 25, 50, 100]}
            striped={true}
            hoverable={true}
            stickyHeader={true}
            emptyMessage="No roles found"
            minHeight="100%"
          />
        </div>
      </div>

      {isFilterOpen && (
        <div className="tab-table-filters">
          <h4 className="kc-sideFilterTitle">
            Filter Options
          </h4>
          <div className="kc-sideFilterStack">
            <div>
              <label className="kc-sideFilterLabel">
                Roles
              </label>
              <SearchableCombobox
                value={roleFilter}
                onChange={(next) => onRoleFilterChange(next)}
                options={[
                  { value: "All", label: "All" },
                  ...uniqueRoles.map((role) => ({ value: role, label: role })),
                ]}
                placeholder="Filter roles"
              />
            </div>
            <button
              onClick={() => {
                onRoleFilterChange("All");
              }}
              className="kc-btn kc-btn-ghost"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesContent;