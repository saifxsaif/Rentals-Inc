import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, setCors } from "../lib/http.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    service: "rentals-inc-api",
  });
}
