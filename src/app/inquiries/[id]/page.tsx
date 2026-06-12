import Screen34InquiryHub from "@/components/screens/Screen34InquiryHub";
import DeptInquiryDetail from "@/components/screens/dept/DeptInquiryDetail";
import LedInquiryHub from "@/components/screens/led/LedInquiryHub";
import RoleRouter from "@/components/screens/dept/RoleRouter";

export default async function InquiryHubPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <RoleRouter
      admin={<Screen34InquiryHub inquiryId={id} />}
      dept={<DeptInquiryDetail inquiryId={id} />}
      ledDept={<LedInquiryHub inquiryId={id} />}
    />
  );
}
