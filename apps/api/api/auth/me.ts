import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser } from "../../lib/session.js";
import { sendJson, setCors } from "../../lib/http.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const user = await getSessionUser(req);

  if (!user) {
    sendJson(res, 401, { error: "Not authenticated" });
    return;
  }

  sendJson(res, 200, { user });
}
