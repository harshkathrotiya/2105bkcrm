import Screen15EquipmentDetail from "@/components/screens/Screen15EquipmentDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = parseInt(id, 10);
  return <Screen15EquipmentDetail equipmentId={parsedId} />;
}
