import { redirect } from "next/navigation";

/** Legacy `/listing` without id: canonical detail pages are `/listing/[id]`. */
export default function LegacyListingIndexRedirect() {
  redirect("/");
}
