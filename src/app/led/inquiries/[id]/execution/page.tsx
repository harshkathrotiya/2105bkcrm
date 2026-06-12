import LedExecutionScreen from "@/components/screens/led/LedExecutionScreen";

export default async function LedExecutionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LedExecutionScreen inquiryId={id} />;
}
