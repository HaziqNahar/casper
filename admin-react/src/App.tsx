import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ROUTES } from "./config/routes";

import HomePage from "./pages/HomePage";
import AppsPage from "./pages/Application/Apps";
import RealmsPage from "./pages/Realms/Realms";
import UsersPage from "./pages/Users/Users";
import AuditLogsPage from "./pages/AuditLogs";
import ManageAppsPage from "./pages/Application/ManageApps";
import ManageRealmsPage from "./pages/Realms/ManageRealms";
import ManageUsersPage from "./pages/Users/ManageUsers";
import CreateUserPage from "./pages/Users/CreateUser";
import Login from "./pages/Authentication/Login";
import RegisterAppsPage from "./pages/Application/RegisterApps";

const App: React.FC = () => {
  return (
    <DataProvider>
      <Router>
        {/* 1) Fixed background image layer (no content inside it) */}
        <div className="app-bg" />

        {/* 2) App root overlay: holds material tokens + all UI */}
        <div className="app-glass-root" data-material="acrylic">
          <Routes>
            <Route element={<DashboardLayout />}>
              {/* Routes */}
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path={ROUTES.HOME} element={<HomePage />} />

              <Route path={ROUTES.APPS} element={<AppsPage />} />
              <Route path={ROUTES.MANAGE_APPS} element={<ManageAppsPage />} />
              <Route path={ROUTES.REGISTER_APPS} element={<RegisterAppsPage />} />

              <Route path={ROUTES.REALMS} element={<RealmsPage />} />
              <Route path={ROUTES.MANAGE_REALMS} element={<ManageRealmsPage />} />

              <Route path={ROUTES.USERS} element={<UsersPage />} />
              <Route path={ROUTES.CREATE_USER} element={<CreateUserPage />} />
              <Route path={ROUTES.MANAGE_USERS} element={<ManageUsersPage />} />

              <Route path={ROUTES.AUDIT_LOGS} element={<AuditLogsPage />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </DataProvider>
  );
};

export default App;
