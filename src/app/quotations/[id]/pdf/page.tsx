import Screen06QuotationPDF from "@/components/screens/Screen06QuotationPDF";

export default async function QuotationPDFPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen06QuotationPDF quotationId={id} />;
}
