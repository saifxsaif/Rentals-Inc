import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteSession, clearSessionCookie, getSessionUser } from "../../lib/session.js";
import { sendJson, setCors } from "../../lib/http.js";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = rest.join("=");
    }
  });
  return cookies;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies["rentals_session"];

  if (token) {
    await deleteSession(token);
  }

  clearSessionCookie(res);
  sendJson(res, 200, { success: true });
}
