import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const CaregiverRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FFFAF5" }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/caregiver/auth" replace />;
  }

  return <>{children}</>;
};
