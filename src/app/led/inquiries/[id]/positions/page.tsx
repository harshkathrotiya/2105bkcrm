import LedPositionsScreen from "@/components/screens/led/LedPositionsScreen";

export default async function LedPositionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LedPositionsScreen inquiryId={id} />;
}
