import { RawId } from "./Named";
import { modelCardId } from "@/lib/model-card";

// Unit VW97 (round 91), card P31.4. Owner pick Q-A 3:21.3 (2026-11-12): "Both fixes in VW97". Owner rule Q-A 3:17.4: "Annotate the names intuitively and properly."
// The text of a model shows the Claude card name ("claude-haiku-5-5 (Claude card ntngh)", lib/readable-names.ts modelOptionText).
// This piece adds the card ID (claude-028c2ffe) in small grey text next to it. Another provider shows nothing, because its ID is already in the text.
// A new file, because the dev server keeps old module instances (VW77a).

/**
 * The card ID of a known Claude card in small grey text, with a leading space. It shows nothing for another provider or a value with no slash.
 * The ID never breaks inside (nowrap), so a narrow table column at 390 px moves it to the next line as one piece.
 */
export function ModelCardId({ value }: { value: string }) {
  const id = modelCardId(value);
  if (id === null) return null;
  return (
    <>
      {" "}
      <span className="whitespace-nowrap">
        <RawId title={`Provider ID of the Claude card: ${id}`}>{id}</RawId>
      </span>
    </>
  );
}
