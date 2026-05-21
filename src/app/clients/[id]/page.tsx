import Screen02EditClient from "@/components/screens/Screen02EditClient";

export default async function EditClientPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <Screen02EditClient clientId={id} />;
}
