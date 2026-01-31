import type { Document } from "@prisma/client";

export type FraudSignal = {
  code: string;
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
};

export type DocumentClassification = {
  documentId: string;
  filename: string;
  type: "id" | "paystub" | "employment" | "bank_statement" | "reference" | "unknown";
  confidence: number;
  extractedData?: Record<string, string>;
};

export type AiReviewResult = {
  fraudScore: number;
  summary: string;
  aiNotes: string;
  signals: FraudSignal[];
  documentClassifications: DocumentClassification[];
  recommendedAction: "approve" | "flag" | "manual_review";
  confidenceLevel: number;
};

const GROK_API_KEY = process.env["GROK_API_KEY"] ?? process.env["XAI_API_KEY"];
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

type GrokMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GrokResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

async function callGrokAPI(messages: GrokMessage[]): Promise<string> {
  if (!GROK_API_KEY) {
    throw new Error("Grok API key not configured");
  }

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GrokResponse;
  return data.choices[0]?.message?.content ?? "";
}

function buildDocumentAnalysisPrompt(documents: Document[], applicantInfo: {
  name: string;
  email: string;
  phone?: string | null;
}): GrokMessage[] {
  const documentList = documents
    .map(
      (doc, i) =>
        `${i + 1}. Filename: "${doc.filename}", Type: ${doc.mimeType}, Size: ${Math.round(doc.sizeBytes / 1024)}KB`
    )
    .join("\n");

  return [
    {
      role: "system",
      content: `You are an expert fraud detection and document verification AI for a residential leasing platform.

Your role is to analyze rental application documents and provide:
1. Classification of each document (id, paystub, employment letter, bank statement, reference, or unknown)
2. Fraud risk assessment with specific signals
3. Detailed notes for human reviewers
4. A recommended action (approve, flag, or manual_review)

Always provide your analysis in valid JSON format matching this structure:
{
  "fraudScore": 0.0-1.0 (0=safe, 1=definite fraud),
  "summary": "Brief 1-sentence summary",
  "aiNotes": "Detailed analysis notes for the reviewer (2-3 paragraphs)",
  "signals": [
    {
      "code": "signal_code",
      "severity": "low|medium|high",
      "description": "What was detected",
      "recommendation": "Suggested action"
    }
  ],
  "documentClassifications": [
    {
      "documentId": "doc_id",
      "filename": "filename",
      "type": "id|paystub|employment|bank_statement|reference|unknown",
      "confidence": 0.0-1.0,
      "extractedData": {"key": "value"} // optional
    }
  ],
  "recommendedAction": "approve|flag|manual_review",
  "confidenceLevel": 0.0-1.0
}

Be thorough but fair. Flag genuine concerns but don't over-flag normal variations.`
    },
    {
      role: "user",
      content: `Analyze this rental application:

APPLICANT INFO:
- Name: ${applicantInfo.name}
- Email: ${applicantInfo.email}
- Phone: ${applicantInfo.phone ?? "Not provided"}

SUBMITTED DOCUMENTS:
${documentList}

Based on the document metadata (filenames, types, sizes), classify each document, assess fraud risk, and provide your detailed analysis. Consider:
- Are all required documents present (ID, income verification, employment)?
- Do filenames suggest legitimate documents?
- Are file sizes reasonable for the document types?
- Any suspicious patterns?

Respond with valid JSON only.`
    }
  ];
}

function parseGrokResponse(response: string, documents: Document[]): AiReviewResult {
  try {
    // Clean up response - remove markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse.slice(7);
    }
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.slice(3);
    }
    if (cleanResponse.endsWith("```")) {
      cleanResponse = cleanResponse.slice(0, -3);
    }

    const parsed = JSON.parse(cleanResponse.trim()) as AiReviewResult;

    // Validate and normalize
    return {
      fraudScore: Math.max(0, Math.min(1, parsed.fraudScore ?? 0.5)),
      summary: parsed.summary ?? "Analysis completed.",
      aiNotes: parsed.aiNotes ?? "No detailed notes provided.",
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      documentClassifications: Array.isArray(parsed.documentClassifications)
        ? parsed.documentClassifications
        : documents.map((doc) => ({
            documentId: doc.id,
            filename: doc.filename,
            type: "unknown" as const,
            confidence: 0.5,
          })),
      recommendedAction: parsed.recommendedAction ?? "manual_review",
      confidenceLevel: Math.max(0, Math.min(1, parsed.confidenceLevel ?? 0.5)),
    };
  } catch {
    // Return a safe fallback if parsing fails
    return {
      fraudScore: 0.5,
      summary: "AI analysis encountered an issue. Manual review recommended.",
      aiNotes: `The AI was unable to fully parse the response. Raw response excerpt: ${response.slice(0, 200)}...`,
      signals: [
        {
          code: "ai_parse_error",
          severity: "medium",
          description: "AI response could not be fully parsed",
          recommendation: "Manual review required",
        },
      ],
      documentClassifications: documents.map((doc) => ({
        documentId: doc.id,
        filename: doc.filename,
        type: "unknown" as const,
        confidence: 0.3,
      })),
      recommendedAction: "manual_review",
      confidenceLevel: 0.3,
    };
  }
}

export async function analyzeDocumentsWithAI(
  documents: Document[],
  applicantInfo: { name: string; email: string; phone?: string | null }
): Promise<AiReviewResult> {
  try {
    const messages = buildDocumentAnalysisPrompt(documents, applicantInfo);
    const response = await callGrokAPI(messages);
    return parseGrokResponse(response, documents);
  } catch (error) {
    console.error("Grok AI analysis failed:", error);
    // Fallback to rule-based analysis
    return analyzeDocumentsFallback(documents);
  }
}

// Fallback rule-based analysis (used when API is unavailable)
export function analyzeDocumentsFallback(documents: Document[]): AiReviewResult {
  const requiredKeywords = ["id", "paystub", "employment", "passport", "license", "income", "pay", "letter"];
  const lowerNames = documents.map((doc) => doc.filename.toLowerCase());

  const signals: FraudSignal[] = [];
  const documentClassifications: DocumentClassification[] = [];

  // Classify documents
  for (const doc of documents) {
    const lower = doc.filename.toLowerCase();
    let type: DocumentClassification["type"] = "unknown";
    let confidence = 0.5;

    if (lower.includes("id") || lower.includes("passport") || lower.includes("license") || lower.includes("driver")) {
      type = "id";
      confidence = 0.8;
    } else if (lower.includes("pay") || lower.includes("stub") || lower.includes("salary") || lower.includes("income")) {
      type = "paystub";
      confidence = 0.8;
    } else if (lower.includes("employ") || lower.includes("letter") || lower.includes("offer") || lower.includes("job")) {
      type = "employment";
      confidence = 0.75;
    } else if (lower.includes("bank") || lower.includes("statement") || lower.includes("account")) {
      type = "bank_statement";
      confidence = 0.75;
    } else if (lower.includes("reference") || lower.includes("landlord") || lower.includes("recommendation")) {
      type = "reference";
      confidence = 0.7;
    }

    documentClassifications.push({
      documentId: doc.id,
      filename: doc.filename,
      type,
      confidence,
    });
  }

  // Check for missing documents
  const hasId = documentClassifications.some((d) => d.type === "id");
  const hasIncome = documentClassifications.some((d) => d.type === "paystub" || d.type === "bank_statement");
  const hasEmployment = documentClassifications.some((d) => d.type === "employment");

  if (!hasId) {
    signals.push({
      code: "missing_id",
      severity: "high",
      description: "No identification document detected",
      recommendation: "Request valid government-issued ID",
    });
  }

  if (!hasIncome) {
    signals.push({
      code: "missing_income_verification",
      severity: "high",
      description: "No income verification document detected",
      recommendation: "Request recent paystubs or bank statements",
    });
  }

  if (!hasEmployment) {
    signals.push({
      code: "missing_employment_verification",
      severity: "medium",
      description: "No employment letter or verification detected",
      recommendation: "Request employment verification letter",
    });
  }

  // Check for suspicious patterns
  if (documents.length > 6) {
    signals.push({
      code: "excessive_documents",
      severity: "low",
      description: "Unusually high number of documents submitted",
      recommendation: "Review for potential confusion or padding",
    });
  }

  const tinyDocs = documents.filter((d) => d.sizeBytes < 5000);
  if (tinyDocs.length > 0) {
    signals.push({
      code: "suspicious_file_size",
      severity: "medium",
      description: `${tinyDocs.length} document(s) have unusually small file sizes`,
      recommendation: "Verify document quality and authenticity",
    });
  }

  // Calculate fraud score
  const highSeverityCount = signals.filter((s) => s.severity === "high").length;
  const mediumSeverityCount = signals.filter((s) => s.severity === "medium").length;
  const fraudScore = Math.min(0.95, 0.1 + highSeverityCount * 0.25 + mediumSeverityCount * 0.1);

  // Determine recommendation
  let recommendedAction: AiReviewResult["recommendedAction"] = "approve";
  if (highSeverityCount >= 2 || fraudScore >= 0.7) {
    recommendedAction = "flag";
  } else if (highSeverityCount >= 1 || mediumSeverityCount >= 2) {
    recommendedAction = "manual_review";
  }

  const summary =
    fraudScore >= 0.7
      ? "High risk detected. Manual review strongly recommended."
      : fraudScore >= 0.4
        ? "Some concerns detected. Recommend careful review."
        : "Documents appear consistent. Low risk detected.";

  const aiNotes = `Rule-based analysis completed (AI API not available).

Document Classification Summary:
${documentClassifications.map((d) => `- ${d.filename}: ${d.type} (${Math.round(d.confidence * 100)}% confidence)`).join("\n")}

Key Findings:
${signals.length > 0 ? signals.map((s) => `- [${s.severity.toUpperCase()}] ${s.description}`).join("\n") : "- No significant issues detected"}

This analysis was performed using rule-based heuristics. For more detailed analysis, ensure the AI API key is configured.`;

  return {
    fraudScore,
    summary,
    aiNotes,
    signals,
    documentClassifications,
    recommendedAction,
    confidenceLevel: 0.6, // Lower confidence for rule-based
  };
}

// Legacy function for backward compatibility
export function analyzeDocuments(documents: Document[]): AiReviewResult {
  return analyzeDocumentsFallback(documents);
}
