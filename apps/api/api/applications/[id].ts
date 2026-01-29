import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
import { canViewApplication, parseRole } from "../../lib/auth.js";
import { sendJson, setCors } from "../../lib/http.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const role = parseRole(req.headers["x-user-role"] as string | undefined);
  if (!canViewApplication(role)) {
    sendJson(res, 403, { error: "Insufficient permissions" });
    return;
  }

  const applicationId = req.query.id as string | undefined;
  if (!applicationId) {
    sendJson(res, 400, { error: "Application id is required" });
    return;
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: true,
      reviewResults: { orderBy: { createdAt: "desc" }, take: 1 },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!application) {
    sendJson(res, 404, { error: "Application not found" });
    return;
  }

  if (role === "applicant") {
    const applicantEmail = (req.headers["x-applicant-email"] as string | undefined) ?? "";
    if (!applicantEmail || applicantEmail !== application.applicantEmail) {
      sendJson(res, 403, { error: "Applicant email does not match" });
      return;
    }
  }

  sendJson(res, 200, { application });
}
