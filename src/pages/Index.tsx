import { useAuth } from "@/hooks/useAuth";
import StudentDashboard from "./StudentDashboard";
import EducatorDashboard from "./EducatorDashboard";
import { Navigate } from "react-router-dom";

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;

  return role === "educator" ? <EducatorDashboard /> : <StudentDashboard />;
}
