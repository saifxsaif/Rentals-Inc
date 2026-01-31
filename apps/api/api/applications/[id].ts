import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
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

  // Get authenticated user
  const user = await getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentication required" });
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

  // Access control based on role
  if (user.role === "applicant") {
    // Applicants can only view their own applications
    if (application.applicantId !== user.id && application.applicantEmail !== user.email) {
      sendJson(res, 403, { error: "You can only view your own applications" });
      return;
    }
  }
  // Reviewers and admins can view all applications

  sendJson(res, 200, { application });
}
