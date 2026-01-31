import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
import { verifyPassword } from "../../lib/crypto.js";
import { createSession, setSessionCookie } from "../../lib/session.js";
import { parseJsonBody, sendJson, setCors } from "../../lib/http.js";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

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

  const body = await parseJsonBody(req);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    sendJson(res, 400, { error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    sendJson(res, 401, { error: "Invalid email or password" });
    return;
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    sendJson(res, 401, { error: "Invalid email or password" });
    return;
  }

  // Create session
  const token = await createSession(user.id);
  setSessionCookie(res, token);

  sendJson(res, 200, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
