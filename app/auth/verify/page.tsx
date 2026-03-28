import { Suspense } from "react";
import VerifyForm from "@/components/VerifyForm";
export default function VerifyPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#FDF8F1]" />}><VerifyForm /></Suspense>;
}
