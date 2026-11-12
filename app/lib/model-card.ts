// Unit VW97 (round 91), card P31.4. Owner pick Q-A 3:21.3 (2026-11-12): "Both fixes in VW97" (fix b: Claude card names in place of provider IDs).
// Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are if you just write `Running` and
// each name is a long id number. Apply this for EVERYTHING."
// A model option has the form "provider/model". For a Claude login the provider is a card ID such as claude-028c2ffe. The screen shows the card name
// ("Claude card ntngh") and keeps the card ID in small grey text or in the hover. The card names come from CARD_NAMES of lib/phase2-wait.ts (VW92),
// which is pure (no file access, no server-only import), so a client component can import this file. The screen never shows an e-mail address.
// A new file, because the dev server keeps old module instances (VW77a).
import { CARD_NAMES } from "./phase2-wait";

/** Short name of a Claude card for a provider ID, or null. Own keys only, so "constructor" and "toString" give null. */
export function cardNameOf(provider: string | null): string | null {
  return provider !== null && Object.hasOwn(CARD_NAMES, provider) ? CARD_NAMES[provider] : null;
}

/** The provider part of a "provider/model" value, or null when the value has no usable slash ("Other…", "plain-model", "/x", "x/"). */
export function providerOf(value: string): string | null {
  const i = value.indexOf("/");
  return i <= 0 || i === value.length - 1 ? null : value.slice(0, i);
}

/** The card ID that the screen shows in small grey text: the provider of a known Claude card, else null (another provider is already in the text). */
export function modelCardId(value: string): string | null {
  const provider = providerOf(value);
  return cardNameOf(provider) !== null ? provider : null;
}

/** Text of the provider part in brackets: "Claude card ntngh" for a known card, "provider xai" for another provider (Q-A 3:21.3). */
export function providerWords(provider: string): string {
  const card = cardNameOf(provider);
  return card !== null ? `Claude card ${card}` : `provider ${provider}`;
}
