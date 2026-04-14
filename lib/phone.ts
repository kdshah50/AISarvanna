/** E.164 without +: Mexico 52 + 10 digits, US/Canada NANP 1 + 10 digits */
export function isValidAuthPhone(phone: string): boolean {
  return /^52\d{10}$/.test(phone) || /^1\d{10}$/.test(phone);
}

/** Normalize phone to digits-only E.164 without plus sign. */
export function normalizeAuthPhone(input: string): string {
  return input.replace(/\D/g, "").replace(/^00/, "");
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
