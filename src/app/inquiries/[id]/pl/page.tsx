import Screen28PLReport from "@/components/screens/Screen28PLReport";

export default async function InquiryPLPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen28PLReport inquiryId={id} />;
}
