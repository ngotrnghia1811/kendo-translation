// Time text for the human-translation-view. Always UTC, so that the server render and the browser render agree.
export function utcTime(pb: string): string {
  const m = /^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d)/.exec(pb ?? "");
  return m ? `${m[1]} ${m[2]} UTC` : "";
}
