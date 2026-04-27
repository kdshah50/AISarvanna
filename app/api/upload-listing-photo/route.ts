import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getUserIdFromRequest } from "@/lib/auth-server";
import { LISTING_PHOTOS_BUCKET } from "@/lib/listing-photos-storage";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per image

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, or WebP images allowed" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const safeId = userId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 36);
    const fileName = `${safeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const supabase = createAdminSupabase();
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .upload(fileName, buf, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[upload-listing-photo]", uploadError);
      return NextResponse.json(
        { error: "Upload failed — ensure bucket listing-photos exists (run migrations)" },
        { status: 500 },
      );
    }

    const { data: pub } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(fileName);
    const url = pub?.publicUrl;
    if (!url) {
      return NextResponse.json({ error: "No public URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url });
  } catch (e: unknown) {
    console.error("[upload-listing-photo]", e);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
