import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#FDF8F1]" />}><LoginForm /></Suspense>;
}
