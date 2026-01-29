import { prisma } from "./prisma.js";
import { analyzeDocuments } from "./ai.js";
import type { UserRole } from "../generated/prisma/index.js";

const FRAUD_THRESHOLD = 0.7;

export async function runReviewWorkflow(
  applicationId: string,
  actorRole: UserRole,
): Promise<void> {
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "under_review" },
  });

  await prisma.auditEvent.create({
    data: {
      applicationId,
      actorRole,
      action: "status_changed",
      metadata: { status: "under_review" },
    },
  });

  const documents = await prisma.document.findMany({
    where: { applicationId },
  });

  const aiResult = analyzeDocuments(documents);

  await prisma.reviewResult.create({
    data: {
      applicationId,
      fraudScore: aiResult.fraudScore,
      summary: aiResult.summary,
      signals: aiResult.signals,
    },
  });

  const nextStatus = aiResult.fraudScore >= FRAUD_THRESHOLD ? "flagged" : "approved";

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: nextStatus },
  });

  await prisma.auditEvent.create({
    data: {
      applicationId,
      actorRole,
      action: "status_changed",
      metadata: { status: nextStatus, reason: "workflow_decision" },
    },
  });
}
