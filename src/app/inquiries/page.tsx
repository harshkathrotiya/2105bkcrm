import { Suspense } from "react";
import Screen10InquiryList from "@/components/screens/Screen10InquiryList";
import DeptInquiries from "@/components/screens/dept/DeptInquiries";
import LedInquiriesList from "@/components/screens/led/LedInquiriesList";
import RoleRouter from "@/components/screens/dept/RoleRouter";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function InquiriesPage() {
  return (
    <Suspense fallback={
      <div className="m-8">
        <LoadingSkeleton type="table" rows={6} cols={5} message="Loading inquiries..." />
      </div>
    }>
      <RoleRouter
        admin={<Screen10InquiryList />}
        dept={<DeptInquiries />}
        ledDept={<LedInquiriesList />}
      />
    </Suspense>
  );
}
