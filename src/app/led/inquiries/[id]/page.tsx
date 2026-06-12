import LedInquiryHub from "@/components/screens/led/LedInquiryHub";

export default async function LedInquiryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LedInquiryHub inquiryId={id} />;
}
