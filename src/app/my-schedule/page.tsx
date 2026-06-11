import StaffLayout from "@/components/screens/staff-portal/StaffLayout";
import StaffDashboard from "@/components/screens/staff-portal/StaffDashboard";

export const metadata = { title: "My Schedule — BK Media" };

export default function StaffDashboardPage() {
  return (
    <StaffLayout>
      <StaffDashboard />
    </StaffLayout>
  );
}
