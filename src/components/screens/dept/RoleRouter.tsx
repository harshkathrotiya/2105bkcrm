"use client";

import { useCurrentUser } from "@/lib/use-current-user";
import StaffPortal from "@/components/screens/StaffPortal";

interface Props {
  admin: React.ReactNode;
  dept: React.ReactNode;
}

export default function RoleRouter({ admin, dept }: Props) {
  const { user, loading } = useCurrentUser();
  if (loading) return null;
  if (user?.role === "Staff") return <StaffPortal />;
  if (user?.role === "Department Head") return <>{dept}</>;
  return <>{admin}</>;
}
