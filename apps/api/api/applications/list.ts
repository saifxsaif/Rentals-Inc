import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma.js";
import { parseRole, canViewApplication } from "../../lib/auth.js";
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

  const role = parseRole(req.headers["x-user-role"] as string | undefined);

  // Only reviewers and admins can list all applications
  if (role !== "reviewer" && role !== "admin") {
    sendJson(res, 403, { error: "Only reviewers and admins can view all applications" });
    return;
  }

  // Parse query params
  const status = req.query.status as string | undefined;
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = parseInt(req.query.offset as string) || 0;

  const whereClause: Record<string, unknown> = {};
  if (status && ["submitted", "under_review", "approved", "flagged"].includes(status)) {
    whereClause.status = status;
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where: whereClause,
      include: {
        documents: {
          select: { id: true, filename: true, mimeType: true, sizeBytes: true },
        },
        reviewResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            fraudScore: true,
            summary: true,
            recommendedAction: true,
            confidenceLevel: true,
            isAiGenerated: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.application.count({ where: whereClause }),
  ]);

  sendJson(res, 200, {
    applications,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + applications.length < total,
    },
  });
}
