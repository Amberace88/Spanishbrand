"use client";
import { useActionState } from "react";
import { askAssistantAction } from "@/app/admin/actions/content";

const EXAMPLES = [
  "¿Qué productos se vendieron más este mes?",
  "¿Qué colección tiene más ingresos?",
  "¿Qué contenido generó más pedidos?",
  "¿Qué productos tienen margen bajo?",
  "¿Qué proveedor tiene más fallos de fulfillment?",
  "¿Qué productos no están disponibles?",
];

export function AssistantBox() {
  const [state, action, pending] = useActionState(askAssistantAction, null);
  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <input name="question" placeholder="Pregunta sobre tu negocio…" className="w-full border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-ink" />
        <button className="btn btn-ink px-4 py-2.5 text-[0.62rem]" disabled={pending}>{pending ? "…" : "Preguntar"}</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button key={e} name="question" value={e} className="rounded-sm bg-bone px-2 py-1 text-xs text-stone-2 hover:text-ink">{e}</button>
        ))}
      </div>
      {state?.answer && <p className="whitespace-pre-line border-l-2 border-oro bg-bone p-4 text-sm">{state.answer}</p>}
      {state?.error && <p className="text-sm text-rojo">{state.error}</p>}
      <p className="text-xs text-stone">Responde solo con datos reales de la base de datos. Nunca inventa cifras.</p>
    </form>
  );
}
