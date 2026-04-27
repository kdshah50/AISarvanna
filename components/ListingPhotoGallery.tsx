"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  photos: string[];
  title: string;
};

export default function ListingPhotoGallery({ photos, title }: Props) {
  const urls = photos.filter(Boolean);
  const [idx, setIdx] = useState(0);

  if (!urls.length) return null;

  const main = urls[Math.min(idx, urls.length - 1)];

  return (
    <div className="mb-6">
      <Image
        src={main}
        alt={title}
        width={1200}
        height={320}
        className="w-full h-80 object-cover rounded-2xl"
        sizes="(max-width: 48rem) 100vw, 48rem"
        priority
      />
      {urls.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {urls.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIdx(i)}
              className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === idx ? "border-[#1B4332] ring-2 ring-[#1B4332]/20" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
