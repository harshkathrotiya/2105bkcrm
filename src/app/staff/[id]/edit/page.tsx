import Screen21AddEditStaff from "@/components/screens/Screen21AddEditStaff";

export const metadata = {
  title: "Edit Staff Profile — BK Media CRM",
};

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staffId = parseInt(id, 10);

  return <Screen21AddEditStaff staffId={staffId} />;
}
