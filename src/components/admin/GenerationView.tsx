import type { ReactNode } from "react";

/** Renders an AI JSON output as readable nested blocks. */
export function GenerationView({ data }: { data: unknown }): ReactNode {
  if (data == null) return null;
  if (typeof data === "string" || typeof data === "number") return <p className="whitespace-pre-line text-sm">{String(data)}</p>;
  if (Array.isArray(data))
    return (
      <ol className="ml-4 list-decimal space-y-2">
        {data.map((d, i) => (
          <li key={i} className="text-sm">
            <GenerationView data={d} />
          </li>
        ))}
      </ol>
    );
  return (
    <dl className="space-y-3">
      {Object.entries(data as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-stone-2">{k.replace(/_/g, " ")}</dt>
          <dd className="mt-1">
            <GenerationView data={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
