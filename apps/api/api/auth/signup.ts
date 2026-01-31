import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/crypto.js";
import { createSession, setSessionCookie } from "../../lib/session.js";
import { parseJsonBody, sendJson, setCors } from "../../lib/http.js";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
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
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    sendJson(res, 400, { error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    sendJson(res, 400, { error: "Email already registered" });
    return;
  }

  // Create user
  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: "applicant", // Default role
    },
  });

  // Create session
  const token = await createSession(user.id);
  setSessionCookie(res, token);

  sendJson(res, 201, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
