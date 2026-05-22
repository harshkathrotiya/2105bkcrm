import Screen14AddEditEquipment from "@/components/screens/Screen14AddEditEquipment";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEquipmentPage({ params }: PageProps) {
  const { id } = await params;
  const parsedId = parseInt(id, 10);
  return <Screen14AddEditEquipment equipmentId={parsedId} />;
}
