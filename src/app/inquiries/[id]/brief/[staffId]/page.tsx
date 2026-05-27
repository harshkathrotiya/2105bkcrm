import Screen30StaffBrief from "@/components/screens/Screen30StaffBrief";

export default async function InquiryStaffBriefPage(
  props: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await props.params;
  return <Screen30StaffBrief inquiryId={id} staffId={staffId} />;
}
