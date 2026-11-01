"use client";
import type { ComponentId } from "@/lib/htv-settings";
import type { ComponentListModel } from "@/lib/reader-layout";

/*
 * The component list (unit RT73b, round 73c answer 4, round 73d answer 5; VISION-viewer 15.26.6.2).
 * The button "Components" in the reader bar opens it as a dialog. On a wide screen the dialog sits at the right edge, like the settings dialog. On a phone it is a sheet.
 * The first-visit panel holds the same list as its first group (embedded, unit default D5).
 * A row is a check box, the name, and a note. A row is grey when the page lacks the component. The note then gives the reason, and the check box keeps its saved state.
 * The button "Reset layout" removes the saved layout of the account. The page then uses the first layout (15.26.6.7).
 */

function Check({ id, label, note, checked, disabled, onChange }: { id: string; label: string; note: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label className={"flex min-h-[44px] items-start gap-2 py-1 text-sm md:min-h-0 " + (disabled ? "text-muted" : "")} data-component-row={id}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} data-component-check={id} className="mt-1" />
      <span>
        {label}
        {note ? <span className="block text-xs text-muted">{note}</span> : null}
      </span>
    </label>
  );
}

export default function ReaderComponentList({
  model,
  onToggle,
  onPair,
  onTerms,
  onReset,
  onClose,
  embedded = false,
}: {
  model: ComponentListModel;
  onToggle: (id: ComponentId) => void;
  onPair: () => void;
  onTerms: () => void;
  onReset: () => void;
  onClose?: () => void;
  /** True in the first-visit panel: no dialog frame and no Close button. */
  embedded?: boolean;
}) {
  const body = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Components</h2>
        {embedded || !onClose ? null : (
          <button type="button" onClick={onClose} data-components-close className="min-h-[44px] rounded border border-line px-3 text-sm md:min-h-0 md:px-2">
            Close
          </button>
        )}
      </div>
      {model.rows.map((r) => (
        <Check key={r.id} id={r.id} label={r.name} note={r.note} checked={r.checked} disabled={r.disabled} onChange={() => onToggle(r.id)} />
      ))}
      <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Added to the panels</h3>
      <Check id="pair" label="Bilingual pairing" note={model.pair.note} checked={model.pair.checked} disabled={model.pair.disabled} onChange={onPair} />
      <Check id="terms" label="Kendo term highlights" note={model.terms.note} checked={model.terms.checked} disabled={model.terms.disabled} onChange={onTerms} />
      <button type="button" onClick={onReset} data-layout-reset className="mt-3 min-h-[44px] rounded border border-line px-3 text-sm md:min-h-0 md:px-2">
        Reset layout
      </button>
    </>
  );
  if (embedded) {
    return (
      <section className="mb-4 border-b border-line pb-3" data-components-embedded aria-label="Components">
        {body}
      </section>
    );
  }
  return (
    <div
      role="dialog"
      aria-label="Components"
      data-components-list
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t border border-line bg-white p-4 shadow-lg md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:w-80 md:rounded"
    >
      {body}
    </div>
  );
}
