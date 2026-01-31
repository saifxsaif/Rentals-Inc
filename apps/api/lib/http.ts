import type { VercelRequest, VercelResponse } from "@vercel/node";

export function setCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin as string | undefined;
  // For credentials to work, we need a specific origin, not *
  res.setHeader("Access-Control-Allow-Origin", origin ?? "https://rentals-inc-web.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Accept,Origin,X-Requested-With",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function sendJson(
  res: VercelResponse,
  status: number,
  payload: unknown,
): void {
  res.status(status).json(payload);
}

export async function parseJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}
