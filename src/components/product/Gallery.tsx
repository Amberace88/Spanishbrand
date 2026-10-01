"use client";
import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      {/* Mobile: swipe rail */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:hidden">
        {images.map((img, i) => (
          <div key={img.url} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface-2">
            <Image src={img.url} alt={img.alt ?? name} fill priority={i === 0} sizes="100vw" className="object-cover" />
          </div>
        ))}
      </div>
      {/* Desktop: main + thumbs */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-[80px_1fr]">
        <div className="flex flex-col gap-3">
          {images.map((img, i) => (
            <button key={img.url} onClick={() => setActive(i)} className={`relative aspect-[4/5] overflow-hidden border ${active === i ? "border-fg" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
          {images[active] && <Image key={images[active].url} src={images[active].url} alt={images[active].alt ?? name} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="animate-rise object-cover" />}
        </div>
      </div>
    </div>
  );
}
