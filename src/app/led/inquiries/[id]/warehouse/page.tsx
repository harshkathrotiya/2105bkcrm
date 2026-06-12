import LedWarehouseScreen from "@/components/screens/led/LedWarehouseScreen";

export default async function LedWarehousePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LedWarehouseScreen inquiryId={id} />;
}
