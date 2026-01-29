import type { Document } from "../generated/prisma/index.js";

export type FraudSignal = {
  code: string;
  description: string;
};

export type AiReviewResult = {
  fraudScore: number;
  summary: string;
  signals: FraudSignal[];
};

const requiredKeywords = ["id", "paystub", "employment"];

export function analyzeDocuments(documents: Document[]): AiReviewResult {
  const lowerNames = documents.map((doc) => doc.filename.toLowerCase());
  const missingKeywords = requiredKeywords.filter(
    (keyword) => !lowerNames.some((name) => name.includes(keyword)),
  );

  const signals: FraudSignal[] = [];
  if (missingKeywords.length > 0) {
    signals.push({
      code: "missing_documents",
      description: `Missing evidence for: ${missingKeywords.join(", ")}`,
    });
  }

  if (documents.length > 4) {
    signals.push({
      code: "excessive_documents",
      description: "More than four documents submitted.",
    });
  }

  const baseScore = 0.15 + documents.length * 0.1;
  const penalty = missingKeywords.length * 0.2;
  const fraudScore = Math.min(0.95, baseScore + penalty);

  return {
    fraudScore,
    summary:
      fraudScore >= 0.7
        ? "Potential risk detected. Manual review recommended."
        : "Documents appear consistent with expectations.",
    signals,
  };
}
