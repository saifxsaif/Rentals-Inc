import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
import { parseRole, canCreateApplication } from "../../lib/auth.js";
import { applicationInputSchema } from "../../lib/validation.js";
import { parseJsonBody, sendJson, setCors } from "../../lib/http.js";
import { runReviewWorkflow } from "../../lib/workflow.js";

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

  const role = parseRole(req.headers["x-user-role"] as string | undefined);
  if (!canCreateApplication(role)) {
    sendJson(res, 403, { error: "Insufficient permissions" });
    return;
  }

  const body = await parseJsonBody(req);
  const parsed = applicationInputSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { applicantName, applicantEmail, applicantPhone, documents } = parsed.data;

  const application = await prisma.application.create({
    data: {
      applicantName,
      applicantEmail,
      applicantPhone: applicantPhone ?? null,
      status: "submitted",
      documents: {
        create: documents.map((doc) => ({
          filename: doc.filename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          storageUrl: null,
        })),
      },
      auditEvents: {
        create: {
          actorRole: role,
          action: "application_submitted",
          metadata: { documentCount: documents.length },
        },
      },
    },
  });

  await runReviewWorkflow(application.id, role);

  const refreshed = await prisma.application.findUnique({
    where: { id: application.id },
    include: {
      documents: true,
      reviewResults: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  sendJson(res, 201, {
    application: refreshed,
  });
}
