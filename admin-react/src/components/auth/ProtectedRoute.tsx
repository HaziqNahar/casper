import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../../config/routes";
import { useAuth } from "../../context/AuthContext";

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === "true";

export default function ProtectedRoute() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (bypassAuth) {
    return <Outlet />;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Checking session...</div>;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }

  if (user.role !== "Admin") {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}