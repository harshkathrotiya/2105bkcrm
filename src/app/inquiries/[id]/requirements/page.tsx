import Screen29ClientRequirements from "@/components/screens/Screen29ClientRequirements";

export default async function InquiryRequirementsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen29ClientRequirements inquiryId={id} />;
}
