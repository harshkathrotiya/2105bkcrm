"use client";

import { useCurrentUser } from "@/lib/use-current-user";
import StaffPortal from "@/components/screens/StaffPortal";

interface Props {
  admin: React.ReactNode;
  dept: React.ReactNode;
  ledDept?: React.ReactNode; // optional LED-specific override
}

export default function RoleRouter({ admin, dept, ledDept }: Props) {
  const { user, loading } = useCurrentUser();
  if (loading) return null;
  if (user?.role === "Staff") return <StaffPortal />;
  if (user?.role === "Department Head") {
    // If a LED-specific component is provided and this user is LED dept head, use it
    if (ledDept && user.department === "LED") return <>{ledDept}</>;
    return <>{dept}</>;
  }
  return <>{admin}</>;
}
