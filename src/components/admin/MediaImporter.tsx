"use client";
import { useEffect, useState } from "react";

const TRUSTED = ["https://grok.com", "https://chatgpt.com"];

/**
 * Receives images from an AI-image tab (window.opener → postMessage {type:"ryg-image", name, dataUrl})
 * and stores them through the same-origin admin API. Also accepts manual file uploads.
 */
export function MediaImporter({ initial }: { initial: { name: string; url: string }[] }) {
  const [items, setItems] = useState(initial);
  const [log, setLog] = useState<string[]>([]);

  const save = async (name: string, dataUrl: string) => {
    const r = await fetch("/api/admin/site-image", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, dataUrl }) });
    const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!r.ok || !j.url) throw new Error(j.error ?? `HTTP ${r.status}`);
    setItems((prev) => [{ name, url: `${j.url}?v=${Date.now()}` }, ...prev.filter((x) => x.name !== name)]);
    return j.url;
  };

  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (!TRUSTED.includes(e.origin)) return;
      const d = e.data as { type?: string; name?: string; dataUrl?: string };
      if (d?.type !== "ryg-image" || !d.name || !d.dataUrl) return;
      try {
        const url = await save(d.name, d.dataUrl);
        setLog((l) => [`✓ ${d.name}`, ...l]);
        (e.source as Window | null)?.postMessage({ type: "ryg-image-ok", name: d.name, url }, e.origin);
      } catch (err) {
        setLog((l) => [`✗ ${d.name}: ${(err as Error).message}`, ...l]);
        (e.source as Window | null)?.postMessage({ type: "ryg-image-error", name: d.name, error: (err as Error).message }, e.origin);
      }
    };
    window.addEventListener("message", onMsg);
    window.opener?.postMessage({ type: "ryg-importer-ready" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const onFile = async (f: File | undefined, name: string) => {
    if (!f || !name) return;
    const dataUrl = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(f);
    });
    try {
      await save(name, dataUrl);
      setLog((l) => [`✓ ${name}`, ...l]);
    } catch (err) {
      setLog((l) => [`✗ ${name}: ${(err as Error).message}`, ...l]);
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3 border border-stone-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void onFile(fd.get("file") as File, String(fd.get("name") ?? "").trim());
        }}
      >
        <label className="text-sm">
          Nombre (p. ej. hero-personaliza)
          <input name="name" pattern="[a-z0-9-]{2,48}" required className="mt-1 block border border-stone-300 px-3 py-2" />
        </label>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
        <button className="bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Subir</button>
      </form>
      {log.length > 0 && <pre className="bg-stone-50 p-3 text-xs">{log.join("\n")}</pre>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((x) => (
          <figure key={x.name} className="border border-stone-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={x.url} alt={x.name} className="aspect-square w-full object-cover" />
            <figcaption className="mt-2 truncate font-mono text-xs">{x.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
