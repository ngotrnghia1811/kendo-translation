/** Q-A 2:8.5: use the actual Host, not forwarded headers or URL normalization. */
export function localWriteProblem(req: Request): string | null {
  const host = req.headers.get("host") ?? "";
  const match = /^(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?$/i.exec(host);
  if (!match || (match[2] !== undefined && (+match[2] < 1 || +match[2] > 65535))) return "Writes require a loopback Host on this Mac.";
  const origin = req.headers.get("origin");
  if (origin !== null) {
    try {
      const u = new URL(origin);
      if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.pathname !== "/" || u.search || u.hash || u.host.toLowerCase() !== host.toLowerCase()) return "Foreign origin.";
    } catch { return "Foreign origin."; }
  }
  return null;
}
