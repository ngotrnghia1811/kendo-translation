import { isIP } from "node:net";

/*
 * Reader address and app key of the public sign-up (unit VW102, Q-A 3:33.3 "Count per reader, with an app key (VW102)").
 * The website sends the sign-up to PocketBase from a Vercel server, so PocketBase sees the address of that server.
 * The route reads the reader address from the request headers and sends it in the header X-Kendo-Client-IP. Migration
 * 1793300015 makes PocketBase count the sign-up limit (migration 1793300014: 5 per hour) for that address.
 * The header X-Kendo-Sign-Up-Key holds the secret app key. The PocketBase hook sign_up_key.pb.js refuses a public sign-up without it.
 * This file holds pure functions with no PocketBase call. No function here logs the key.
 */

/** Header names between the app and PocketBase. The hook sign_up_key.pb.js and migration 1793300015 use the same names. */
export const SIGN_UP_KEY_HEADER = "X-Kendo-Sign-Up-Key";
export const CLIENT_IP_HEADER = "X-Kendo-Client-IP";

/** The text of a valid IPv4 or IPv6 address, trimmed, or null. A zone id such as fe80::1%en0 is not valid. */
export function validClientIp(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v || v.length > 45 || v.includes("%")) return null;
  return isIP(v) === 0 ? null : v;
}

/**
 * The reader address from the request headers.
 * Source: https://vercel.com/docs/headers/request-headers. `x-forwarded-for` is the public IP address of the client.
 * Vercel overwrites a value that the client sends, so the header holds one address. `x-real-ip` is identical.
 * With several values, the rightmost valid one counts. PocketBase takes the rightmost valid address too (useLeftmostIP false).
 * Null when no header holds a valid address (for example on this Mac, where no proxy sets the header).
 */
export function readerAddress(headers: Headers): string | null {
  for (const name of ["x-forwarded-for", "x-real-ip"]) {
    const list = headers.get(name);
    if (!list) continue;
    const parts = list.split(",");
    for (let i = parts.length - 1; i >= 0; i--) {
      const ip = validClientIp(parts[i]);
      if (ip) return ip;
    }
  }
  return null;
}

/** The two headers of a public sign-up. The key goes in only when it is set. The address goes in only when it is valid. */
export function signUpHeaders(key: string | undefined, address: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (key) headers[SIGN_UP_KEY_HEADER] = key;
  const ip = validClientIp(address);
  if (ip) headers[CLIENT_IP_HEADER] = ip;
  return headers;
}
