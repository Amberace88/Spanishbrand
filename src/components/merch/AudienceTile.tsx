import Link from "next/link";
import Image from "next/image";
import { IconArrow } from "@/components/ui/Icons";

/** Photo tile for an audience (mujer, hombre, niños…): same language as the editorial tiles. */
export function AudienceTile({ href, label, count, cover, sizes = "(min-width:640px) 20vw, 42vw" }: { href: string; label: string; count?: string | null; cover: string | null; sizes?: string }) {
  return (
    <Link href={href} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#17130f] text-white">
      {cover ? (
        <Image src={cover} alt={label} fill sizes={sizes} className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/catalog/art/lion-crowned.png" alt="" className="absolute inset-0 m-auto h-1/2 w-1/2 object-contain opacity-80 transition-transform duration-700 group-hover:scale-110" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <p className="mega flex items-center justify-between gap-2 text-2xl sm:text-3xl">
          {label} <IconArrow className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1" />
        </p>
        {count && <p className="mt-1 text-[13px] font-medium text-white/80">{count}</p>}
      </div>
    </Link>
  );
}
