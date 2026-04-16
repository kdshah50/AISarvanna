/**
 * E.164 digits without leading +.
 * Mexico mobile (WhatsApp/Twilio): country 52 + mobile trunk 1 + 10-digit national → `521` + 10 digits (13 chars).
 * Legacy bug used `52` + 10 digits (12 chars); we still accept it and canonicalize to `521…`.
 * US/Canada: `1` + 10 digits (NANP).
 */
export function isValidAuthPhone(phone: string): boolean {
  return /^521\d{10}$/.test(phone) || /^52\d{10}$/.test(phone) || /^1\d{10}$/.test(phone);
}

/** Normalize phone to digits-only E.164 without plus sign. */
export function normalizeAuthPhone(input: string): string {
  return input.replace(/\D/g, "").replace(/^00/, "");
}

/** Mexico mobile: ensure `521` + 10 digits so Twilio/WhatsApp match international mobile routing. */
export function canonicalizeAuthPhone(phone: string): string {
  if (/^52\d{10}$/.test(phone)) {
    return `521${phone.slice(2)}`;
  }
  return phone;
}

export function formatMxLocalInput(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

/** US/CA 10-digit NANP: (555) 123-4567 */
export function formatUsLocalInput(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function nationalDigitsForDisplay(phone: string): { prefix: string; formatted: string } {
  if (!phone) return { prefix: "", formatted: "" };
  if (phone.startsWith("521") && phone.length === 13) {
    const n = phone.slice(3);
    return {
      prefix: "+52 1",
      formatted: n.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3"),
    };
  }
  if (phone.startsWith("52") && phone.length === 12) {
    const n = phone.slice(2);
    return {
      prefix: "+52",
      formatted: n.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3"),
    };
  }
  if (phone.startsWith("1") && phone.length === 11) {
    const n = phone.slice(1);
    return {
      prefix: "+1",
      formatted: n.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    };
  }
  return { prefix: `+${phone}`, formatted: phone };
}
