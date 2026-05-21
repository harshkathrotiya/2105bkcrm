import Screen08Invoice from "@/components/screens/Screen08Invoice";

export default async function InvoicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen08Invoice invoiceId={id} />;
}
