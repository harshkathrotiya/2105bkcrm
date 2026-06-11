import StaffLayout from "@/components/screens/staff-portal/StaffLayout";
import StaffMyPayments from "@/components/screens/staff-portal/StaffMyPayments";

export const metadata = { title: "My Payments — BK Media" };

export default function StaffPaymentsPage() {
  return (
    <StaffLayout>
      <StaffMyPayments />
    </StaffLayout>
  );
}
