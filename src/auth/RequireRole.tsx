import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth";

export type AppRole = "admin" | "buyer" | "farmer" | "depo" | "delivery";

export function RequireRole({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { auth } = useAuth();
  const location = useLocation();
  const role = auth?.user.role;

  if (!role || !roles.includes(role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
