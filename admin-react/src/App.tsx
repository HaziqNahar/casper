import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { ROUTES } from "./config/routes";

const HomePage = lazy(() => import("./pages/HomePage"));
const AppsPage = lazy(() => import("./pages/Application/Apps"));
const RealmsPage = lazy(() => import("./pages/Realms/Realms"));
const UsersPage = lazy(() => import("./pages/Users/Users"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogs"));
const ApprovalRequestsPage = lazy(() => import("./pages/ApprovalRequests"));
const EquipmentAssetInventoryPage = lazy(() => import("./pages/EquipmentAssetInventory"));
const ManageRealmsPage = lazy(() => import("./pages/Realms/ManageRealms"));
const CreateUserPage = lazy(() => import("./pages/Users/CreateUser"));
const Login = lazy(() => import("./pages/Authentication/Login"));
const RegisterAppsPage = lazy(() => import("./pages/Application/RegisterApplicationPage"));
const ApplicationOAuthSettingsPage = lazy(() => import("./pages/Application/ApplicationOAuthSettingsPage"));
const CreateRealmPage = lazy(() => import("./pages/Realms/CreateRealm"));
const RealmAccessRequest = lazy(() => import("./pages/Realms/access/RealmAccessRequest"));
const RealmAccessApprove = lazy(() => import("./pages/Realms/access/RealmAccessApprove"));
const RealmAccessVerify = lazy(() => import("./pages/Realms/access/RealmAccessVerify"));
const RealmAccessAudit = lazy(() => import("./pages/Realms/access/RealmAccessAudit"));

const routeFallback = (
  <div
    style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      color: "#e2e8f0",
      fontSize: "0.95rem",
      fontWeight: 700,
      letterSpacing: 0,
    }}
  >
    Loading...
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={routeFallback}>
          <div className="app-bg" />

          <div className="app-glass-root" data-material="acrylic">
            <Routes>
              <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route
                  element={
                    <DataProvider>
                      <DashboardLayout />
                    </DataProvider>
                  }
                >
                  <Route path={ROUTES.HOME} element={<HomePage />} />

                  <Route path={ROUTES.APPS} element={<AppsPage />} />
                  <Route path={ROUTES.REGISTER_APPS} element={<RegisterAppsPage />} />
                  <Route path="/apps/:appId/oauth" element={<ApplicationOAuthSettingsPage />} />

                  <Route path={ROUTES.REALMS} element={<RealmsPage />} />
                  <Route path={ROUTES.MANAGE_REALMS} element={<ManageRealmsPage />} />
                  <Route path={ROUTES.CREATE_REALM} element={<CreateRealmPage />} />

                  <Route path={ROUTES.REALM_ACCESS_REQUEST} element={<RealmAccessRequest />} />
                  <Route path={ROUTES.REALM_ACCESS_APPROVE} element={<RealmAccessApprove />} />
                  <Route path={ROUTES.REALM_ACCESS_VERIFY} element={<RealmAccessVerify />} />
                  <Route path={ROUTES.REALM_ACCESS_AUDIT} element={<RealmAccessAudit />} />

                  <Route path={ROUTES.USERS} element={<UsersPage />} />
                  <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
                  <Route path={ROUTES.CREATE_USER} element={<CreateUserPage />} />

                  <Route path={ROUTES.EQUIPMENT_ASSETS} element={<EquipmentAssetInventoryPage />} />
                  <Route path={ROUTES.AUDIT_LOGS} element={<AuditLogsPage />} />
                  <Route path={ROUTES.APPROVAL_REQUESTS} element={<ApprovalRequestsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Routes>
          </div>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;