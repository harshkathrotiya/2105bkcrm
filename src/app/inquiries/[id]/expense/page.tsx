import Screen27ExpenseReport from "@/components/screens/Screen27ExpenseReport";

export default async function InquiryExpensePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen27ExpenseReport inquiryId={id} />;
}
