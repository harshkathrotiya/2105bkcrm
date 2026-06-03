import Screen34InquiryHub from "@/components/screens/Screen34InquiryHub";

export default async function InquiryHubPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen34InquiryHub inquiryId={id} />;
}
