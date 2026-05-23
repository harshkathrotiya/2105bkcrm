import Screen22StaffProfile from "@/components/screens/Screen22StaffProfile";

export const metadata = {
  title: "Staff Profile — BK Media CRM",
};

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staffId = parseInt(id, 10);

  return <Screen22StaffProfile staffId={staffId} />;
}
