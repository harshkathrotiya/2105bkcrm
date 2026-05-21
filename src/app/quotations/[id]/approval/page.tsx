import Screen07Approval from "@/components/screens/Screen07Approval";

export default async function ApprovalPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen07Approval quotationId={id} />;
}
