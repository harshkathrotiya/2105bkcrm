import LedOperatorScreen from "@/components/screens/led/LedOperatorScreen";

export default async function LedOperatorsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LedOperatorScreen inquiryId={id} />;
}
