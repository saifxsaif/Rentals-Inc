import { prisma } from "./prisma.js";
import { analyzeDocumentsWithAI, analyzeDocumentsFallback, isAiApiAvailable } from "./ai.js";
import type { UserRole } from "@prisma/client";

const FRAUD_THRESHOLD = 0.7;
const MANUAL_REVIEW_THRESHOLD = 0.4;

export async function runReviewWorkflow(
  applicationId: string,
  actorRole: UserRole,
): Promise<void> {
  // Transition to under_review
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

  // Fetch application with documents
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { documents: true },
  });

  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }

  // Run AI analysis
  let aiResult;
  const useRealAI = isAiApiAvailable();

  if (useRealAI) {
    try {
      aiResult = await analyzeDocumentsWithAI(application.documents, {
        name: application.applicantName,
        email: application.applicantEmail,
        phone: application.applicantPhone,
      });

      await prisma.auditEvent.create({
        data: {
          applicationId,
          actorRole: "admin", // System action
          action: "ai_analysis_completed",
          metadata: {
            provider: "openai",
            confidenceLevel: aiResult.confidenceLevel,
            recommendedAction: aiResult.recommendedAction,
          },
        },
      });
    } catch (error) {
      console.error("AI analysis failed, falling back to rules:", error);
      aiResult = analyzeDocumentsFallback(application.documents);

      await prisma.auditEvent.create({
        data: {
          applicationId,
          actorRole: "admin",
          action: "ai_analysis_fallback",
          metadata: { reason: "api_error" },
        },
      });
    }
  } else {
    aiResult = analyzeDocumentsFallback(application.documents);

    await prisma.auditEvent.create({
      data: {
        applicationId,
        actorRole: "admin",
        action: "rule_based_analysis_completed",
        metadata: { reason: "no_api_key" },
      },
    });
  }

  // Store the review result
  await prisma.reviewResult.create({
    data: {
      applicationId,
      fraudScore: aiResult.fraudScore,
      summary: aiResult.summary,
      aiNotes: aiResult.aiNotes,
      signals: aiResult.signals,
      documentClassifications: aiResult.documentClassifications,
      recommendedAction: aiResult.recommendedAction,
      confidenceLevel: aiResult.confidenceLevel,
      isAiGenerated: useRealAI,
    },
  });

  // Determine next status based on AI recommendation
  let nextStatus: "approved" | "flagged" | "under_review";

  if (aiResult.recommendedAction === "flag" || aiResult.fraudScore >= FRAUD_THRESHOLD) {
    nextStatus = "flagged";
  } else if (aiResult.recommendedAction === "manual_review" || aiResult.fraudScore >= MANUAL_REVIEW_THRESHOLD) {
    // Keep under_review for manual intervention
    nextStatus = "under_review";
  } else {
    nextStatus = "approved";
  }

  // Update application status
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: nextStatus },
  });

  await prisma.auditEvent.create({
    data: {
      applicationId,
      actorRole: "admin", // System/AI decision
      action: "workflow_decision",
      metadata: {
        status: nextStatus,
        fraudScore: aiResult.fraudScore,
        recommendedAction: aiResult.recommendedAction,
        confidenceLevel: aiResult.confidenceLevel,
        isAutomated: true,
        note: "This is an AI-suggested action. Human review can override.",
      },
    },
  });
}
