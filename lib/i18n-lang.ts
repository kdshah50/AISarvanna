export type Lang = "en" | "es";

export function langFromParam(raw: string | undefined): Lang {
  return raw === "en" || raw === "es" ? raw : "es";
}
