import LedExpenseScreen from "@/components/screens/led/LedExpenseScreen";

export default async function LedExpensesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LedExpenseScreen inquiryId={id} />;
}
