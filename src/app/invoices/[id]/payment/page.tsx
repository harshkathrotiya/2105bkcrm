import Screen09PaymentTracking from "@/components/screens/Screen09PaymentTracking";

export default async function PaymentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen09PaymentTracking invoiceId={id} />;
}
