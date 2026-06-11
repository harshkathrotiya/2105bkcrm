import StaffLayout from "@/components/screens/staff-portal/StaffLayout";
import StaffMyEvents from "@/components/screens/staff-portal/StaffMyEvents";

export const metadata = { title: "My Events — BK Media" };

export default function StaffEventsPage() {
  return (
    <StaffLayout>
      <StaffMyEvents />
    </StaffLayout>
  );
}
