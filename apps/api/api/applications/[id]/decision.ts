import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../../lib/prisma.js";
import { getSessionUser } from "../../../lib/session.js";
import { decisionInputSchema } from "../../../lib/validation.js";
import { parseJsonBody, sendJson, setCors } from "../../../lib/http.js";

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

  // Get authenticated user
  const user = await getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentication required" });
    return;
  }

  // Only reviewers and admins can make decisions
  if (user.role !== "reviewer" && user.role !== "admin") {
    sendJson(res, 403, { error: "Only reviewers and admins can make decisions" });
    return;
  }

  const applicationId = req.query.id as string | undefined;
  if (!applicationId) {
    sendJson(res, 400, { error: "Application id is required" });
    return;
  }

  const body = await parseJsonBody(req);
  const parsed = decisionInputSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { decision, notes } = parsed.data;

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status: decision },
  });

  await prisma.auditEvent.create({
    data: {
      applicationId,
      actorRole: user.role,
      action: "manual_decision",
      metadata: {
        decision,
        notes: notes ?? null,
        userId: user.id,
        userName: user.name,
      },
    },
  });

  sendJson(res, 200, { application });
}
