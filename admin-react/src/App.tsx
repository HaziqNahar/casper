import { Routes, Route, Navigate } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
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

const App: React.FC = () => {
  return (
    <DataProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Dashboard Layout wraps all routes */}
            <Route element={<DashboardLayout />}>
              {/* Home */}
              <Route path={ROUTES.HOME} element={<HomePage />} />
              {/* Apps */}
              <Route path={ROUTES.APPS} element={<AppsPage />} />
              <Route path={ROUTES.MANAGE_APPS} element={<ManageAppsPage />} />
              {/* Realms */}
              <Route path={ROUTES.REALMS} element={<RealmsPage />} />
              <Route path={ROUTES.MANAGE_REALMS} element={<ManageRealmsPage />} />
              {/* Users */}
              <Route path={ROUTES.USERS} element={<UsersPage />} />
              <Route path={ROUTES.MANAGE_USERS} element={<ManageUsersPage />} />
              {/* Audit Logs */}
              <Route path={ROUTES.AUDIT_LOGS} element={<AuditLogsPage />} />
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </DataProvider>
  );
};

export default App;