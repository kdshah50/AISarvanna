import { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export const REFERRAL_BONUS_POINTS = 25;
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Create a short unique referral code; retries on collision.
 */
export async function ensureReferralCode(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: row } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (row?.code) return row.code;

  for (let i = 0; i < 8; i++) {
    const code = randomCode(8);
    const { data: ins, error } = await supabase
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .single();
    if (!error && ins?.code) return ins.code;
  }
  throw new Error("Could not generate referral code");
}

function randomCode(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * On a buyer's first successful paid booking, credit the referrer with bonus points (once, idempotent).
 */
export async function maybeAwardReferralBonus(
  supabase: SupabaseClient,
  buyerId: string,
  bookingId: string,
): Promise<void> {
  const { data: booking } = await supabase
    .from("service_bookings")
    .select("id,referral_bonus_granted_at,buyer_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.referral_bonus_granted_at) return;
  if (booking.buyer_id !== buyerId) return;

  const { count, error: cErr } = await supabase
    .from("service_bookings")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId)
    .eq("payment_status", "paid");
  if (cErr || (count ?? 0) !== 1) return;

  const { data: buyer } = await supabase
    .from("users")
    .select("referred_by")
    .eq("id", buyerId)
    .maybeSingle();
  const referrerId = buyer?.referred_by?.trim() ?? null;
  if (!referrerId || referrerId === buyerId) return;

  const { data: rAcc } = await supabase
    .from("loyalty_accounts")
    .select("points_balance,points_earned_total")
    .eq("user_id", referrerId)
    .maybeSingle();

  if (rAcc) {
    await supabase
      .from("loyalty_accounts")
      .update({
        points_balance: rAcc.points_balance + REFERRAL_BONUS_POINTS,
        points_earned_total: rAcc.points_earned_total + REFERRAL_BONUS_POINTS,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", referrerId);
  } else {
    await supabase.from("loyalty_accounts").insert({
      user_id: referrerId,
      points_balance: REFERRAL_BONUS_POINTS,
      points_earned_total: REFERRAL_BONUS_POINTS,
      booking_count: 0,
    });
  }

  await supabase.from("loyalty_transactions").insert({
    user_id: referrerId,
    booking_id: bookingId,
    type: "bonus",
    points: REFERRAL_BONUS_POINTS,
    description: `+${REFERRAL_BONUS_POINTS} pts (referral — friend’s first booking)`,
  });

  await supabase
    .from("service_bookings")
    .update({ referral_bonus_granted_at: new Date().toISOString() })
    .eq("id", bookingId);
}
