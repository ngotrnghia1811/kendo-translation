"use client";
import { markNavigating } from "@/lib/loading-rule";
import { PAIRED_BOOK, VECTOR_MAP_PATH } from "@/lib/vector-map-rules";

// Unit VW130 (Q-A 3:133.2 row 1): the select of the book on the vector map. The first choice is the phase 2 paired dataset (the map of today, the default).
// The other choices are the books that have stored prompt versions. A choice opens the same box type of that book. The prompt version and the point
// stay out of the address, because another book has other versions. The form is a plain GET form, so the address shows the choice.

export default function VectorMapBookSelect({ value, box, options }: { value: string; box: string; options: { slug: string; label: string; versions: number }[] }) {
  return (
    <form data-vm-book-form method="get" action={VECTOR_MAP_PATH} className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <input type="hidden" name="box" value={box} />
      <label htmlFor="vm-book" className="font-semibold">
        Book
      </label>
      <select
        id="vm-book"
        name="book"
        data-vm-book-select
        defaultValue={value}
        onChange={(e) => {
          markNavigating();
          e.currentTarget.form?.requestSubmit();
        }}
        className="min-h-[32px] min-w-0 max-w-full rounded border border-line bg-white px-1.5 py-0.5 text-sm text-foreground"
      >
        <option value={PAIRED_BOOK}>Phase 2 paired dataset</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}, {o.versions} prompt versions
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="rounded border border-line bg-white px-2 py-0.5 text-sm font-medium text-foreground">
          Show
        </button>
      </noscript>
    </form>
  );
}
