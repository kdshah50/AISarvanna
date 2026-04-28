"use client";

import { useState, useEffect } from "react";

type Tx = {
  id: string;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
};

type LoyaltyData = {
  account: {
    points_balance: number;
    points_earned_total: number;
    points_redeemed_total: number;
    booking_count: number;
  };
  reward: {
    everyN: number;
    discountPct: number;
    bookingsUntilReward: number;
    bookingCount: number;
  };
  transactions?: Tx[];
};

export default function LoyaltyCard({ lang = "en" }: { lang?: "es" | "en" }) {
  const [data, setData] = useState<LoyaltyData | null>(null);

  useEffect(() => {
    fetch("/api/loyalty", { credentials: "same-origin" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { account, reward, transactions = [] } = data;
  const progress = reward.everyN > 0
    ? ((reward.bookingCount % reward.everyN) / reward.everyN) * 100
    : 0;

  const dots = Array.from({ length: reward.everyN }, (_, i) => i < (reward.bookingCount % reward.everyN));

  return (
    <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-2xl p-5 text-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-white/70">
            {lang === "es" ? "Programa de lealtad" : "Loyalty program"}
          </p>
          <p className="text-lg font-bold">
            {account.points_balance} {lang === "es" ? "puntos" : "points"}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
          ⭐
        </div>
      </div>

      {/* Progress to next reward */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/70 mb-1.5">
          <span>
            {lang === "es"
              ? `${account.booking_count} reserva${account.booking_count !== 1 ? "s" : ""}`
              : `${account.booking_count} booking${account.booking_count !== 1 ? "s" : ""}`}
          </span>
          <span>
            {reward.bookingsUntilReward > 0
              ? lang === "es"
                ? `${reward.bookingsUntilReward} más para ${reward.discountPct}% desc.`
                : `${reward.bookingsUntilReward} more for ${reward.discountPct}% off`
              : lang === "es"
                ? `¡${reward.discountPct}% desc. en tu próxima!`
                : `${reward.discountPct}% off your next!`}
          </span>
        </div>

        {/* Dot progress */}
        <div className="flex gap-1.5">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-colors ${
                filled ? "bg-[#D4A017]" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {reward.bookingsUntilReward === 0 && (
        <div className="bg-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-center">
          🎉 {lang === "es"
            ? `¡Tu próxima reserva tiene ${reward.discountPct}% de descuento!`
            : `Your next booking is ${reward.discountPct}% off!`}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-2">
            {lang === "es" ? "Actividad reciente" : "Recent activity"}
          </p>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto text-[11px] text-white/90">
            {transactions.slice(0, 8).map((tx) => (
              <li key={tx.id} className="flex justify-between gap-2">
                <span className="truncate opacity-90">{tx.description ?? tx.type}</span>
                <span className={tx.points >= 0 ? "text-[#D4A017] font-semibold" : "text-red-200"}>
                  {tx.points >= 0 ? "+" : ""}
                  {tx.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
