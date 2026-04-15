"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ConversationThread from "@/components/ConversationThread";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = String(params.conversationId ?? "");
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (me.ok) {
        const j = await me.json();
        setMyUserId(j.user?.id ?? null);
      }
    })();
  }, []);

  if (!conversationId) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FDF8F1] px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/messages" className="text-sm text-[#6B7280] hover:text-[#1B4332] mb-4 inline-block">
          ← Mensajes
        </Link>
        <ConversationThread conversationId={conversationId} myUserId={myUserId} />
      </div>
    </main>
  );
}
