import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/crypto.js";
import { parseJsonBody, sendJson, setCors } from "../../lib/http.js";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["applicant", "reviewer", "admin"]),
  adminSecret: z.string(),
});

// Secret for creating admin/reviewer users (should be env var in production)
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "rentals-admin-secret-2026";

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
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    sendJson(res, 400, { error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password, name, role, adminSecret } = parsed.data;

  // Verify admin secret
  if (adminSecret !== ADMIN_SECRET) {
    sendJson(res, 403, { error: "Invalid admin secret" });
    return;
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    sendJson(res, 400, { error: "Email already registered" });
    return;
  }

  // Create user with specified role
  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  });

  sendJson(res, 201, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
