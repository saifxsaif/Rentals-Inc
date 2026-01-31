"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Role = "applicant" | "reviewer" | "admin";

type FraudSignal = {
  code: string;
  severity?: "low" | "medium" | "high";
  description: string;
  recommendation?: string;
};

type DocumentClassification = {
  documentId: string;
  filename: string;
  type: string;
  confidence: number;
};

type ReviewResult = {
  fraudScore: number;
  summary: string;
  aiNotes?: string;
  signals?: FraudSignal[];
  documentClassifications?: DocumentClassification[];
  recommendedAction?: string;
  confidenceLevel?: number;
  isAiGenerated?: boolean;
  createdAt: string;
};

type AuditEvent = {
  action: string;
  actorRole: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type ApplicationResponse = {
  application?: {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    documents: Array<{
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    }>;
    reviewResults: ReviewResult[];
    auditEvents: AuditEvent[];
  };
  error?: string;
};

type Decision = "approved" | "flagged";

const StatusBadge = ({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) => {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    submitted: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    under_review: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    flagged: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const { bg, text, border } = config[status] ?? config.submitted;

  return (
    <span className={`inline-flex items-center rounded-full border font-medium capitalize ${bg} ${text} ${border} ${sizeClasses[size]}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const SeverityBadge = ({ severity }: { severity?: string }) => {
  const colors: Record<string, string> = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  };

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${colors[severity ?? "medium"] ?? colors.medium}`}>
      {severity ?? "medium"}
    </span>
  );
};

const DocumentTypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    id: "bg-purple-100 text-purple-700",
    paystub: "bg-green-100 text-green-700",
    employment: "bg-blue-100 text-blue-700",
    bank_statement: "bg-cyan-100 text-cyan-700",
    reference: "bg-orange-100 text-orange-700",
    unknown: "bg-slate-100 text-slate-500",
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type] ?? colors.unknown}`}>
      {type.replace("_", " ")}
    </span>
  );
};

const RiskMeter = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  const color =
    score >= 0.7 ? "bg-rose-500" : score >= 0.4 ? "bg-amber-500" : "bg-emerald-500";
  const label =
    score >= 0.7 ? "High Risk" : score >= 0.4 ? "Medium Risk" : "Low Risk";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Fraud Risk Score</span>
        <span className={`font-semibold ${score >= 0.7 ? "text-rose-600" : score >= 0.4 ? "text-amber-600" : "text-emerald-600"}`}>
          {percentage}% - {label}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const TimelineEvent = ({ event, isLast }: { event: AuditEvent; isLast: boolean }) => {
  const actionConfig: Record<string, { icon: string; color: string }> = {
    application_submitted: {
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      color: "bg-blue-100 text-blue-600",
    },
    status_changed: {
      icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
      color: "bg-amber-100 text-amber-600",
    },
    ai_analysis_completed: {
      icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      color: "bg-purple-100 text-purple-600",
    },
    workflow_decision: {
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "bg-emerald-100 text-emerald-600",
    },
    manual_decision: {
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      color: "bg-indigo-100 text-indigo-600",
    },
  };

  const config = actionConfig[event.action] ?? actionConfig.status_changed;

  return (
    <div className="relative flex gap-4 pb-6">
      {!isLast && (
        <div className="absolute left-[15px] top-8 h-full w-0.5 bg-slate-200" />
      )}
      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
        </svg>
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-slate-900">
          {event.action.replace(/_/g, " ")}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          by {event.actorRole} • {new Date(event.createdAt).toLocaleString()}
        </p>
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
            {Object.entries(event.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function StatusPage() {
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : undefined;

  const [role, setRole] = useState<Role>("reviewer");
  const [email, setEmail] = useState("");
  const [response, setResponse] = useState<ApplicationResponse | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "documents" | "timeline">("overview");

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  const fetchStatus = async () => {
    setLoading(true);
    setResponse(null);

    try {
      if (!id) {
        setResponse({ error: "Missing application id in the URL." });
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/applications/${id}`, {
        headers: {
          "X-User-Role": role,
          "X-Applicant-Email": email,
        },
      });
      const json = (await res.json()) as ApplicationResponse;
      setResponse(json);
    } catch (error) {
      setResponse({ error: "Failed to load application status." });
    } finally {
      setLoading(false);
    }
  };

  const submitDecision = async (decision: Decision) => {
    setLoading(true);

    try {
      if (!id) {
        setResponse({ error: "Missing application id in the URL." });
        return;
      }

      const res = await fetch(
        `${apiBaseUrl}/api/applications/${id}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": role,
          },
          body: JSON.stringify({
            decision,
            notes: decisionNote || undefined,
          }),
        },
      );
      const json = (await res.json()) as ApplicationResponse;
      setResponse(json);
      setDecisionNote("");
      // Refresh to get updated data
      fetchStatus();
    } catch (error) {
      setResponse({ error: "Failed to submit decision." });
    } finally {
      setLoading(false);
    }
  };

  const app = response?.application;
  const latestReview = app?.reviewResults?.[0];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
            <p className="mt-1 font-mono text-sm text-slate-500">{id ?? "Unknown ID"}</p>
          </div>

          {app && <StatusBadge status={app.status} size="lg" />}
        </div>

        {/* Auth Controls */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="applicant">Applicant</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {role === "applicant" && (
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">
                  Your Email (for verification)
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            )}

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Fetch Details"}
            </button>
          </div>
        </div>

        {/* Error State */}
        {response?.error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-rose-800">{response.error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {app && (
          <>
            {/* Tabs */}
            <div className="mb-6 border-b border-slate-200">
              <nav className="flex gap-6">
                {(["overview", "ai", "documents", "timeline"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 pb-3 text-sm font-medium transition ${
                      activeTab === tab
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab === "ai" ? "AI Analysis" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Panel */}
              <div className="lg:col-span-2">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Applicant Info */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h2 className="mb-4 text-lg font-semibold text-slate-900">Applicant Information</h2>
                      <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm text-slate-500">Full Name</dt>
                          <dd className="mt-1 font-medium text-slate-900">{app.applicantName}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">Email</dt>
                          <dd className="mt-1 font-medium text-slate-900">{app.applicantEmail}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">Phone</dt>
                          <dd className="mt-1 font-medium text-slate-900">{app.applicantPhone ?? "Not provided"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">Submitted</dt>
                          <dd className="mt-1 font-medium text-slate-900">
                            {new Date(app.createdAt).toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Risk Score */}
                    {latestReview && (
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Risk Assessment</h2>
                        <RiskMeter score={latestReview.fraudScore} />
                        <p className="mt-4 text-sm text-slate-600">{latestReview.summary}</p>
                        {latestReview.recommendedAction && (
                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-sm text-slate-500">AI Recommendation:</span>
                            <StatusBadge status={latestReview.recommendedAction} size="sm" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "ai" && latestReview && (
                  <div className="space-y-6">
                    {/* AI Notes */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">AI Analysis Notes</h2>
                        {latestReview.isAiGenerated !== false && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                            </svg>
                            AI Generated
                          </span>
                        )}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap text-sm text-slate-700">
                          {latestReview.aiNotes ?? "No detailed notes available."}
                        </p>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        This analysis is AI-generated and should be reviewed by a human before making final decisions.
                      </p>
                    </div>

                    {/* Fraud Signals */}
                    {latestReview.signals && latestReview.signals.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Detected Signals</h2>
                        <div className="space-y-3">
                          {latestReview.signals.map((signal, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium text-slate-900">
                                      {signal.code}
                                    </span>
                                    <SeverityBadge severity={signal.severity} />
                                  </div>
                                  <p className="mt-1 text-sm text-slate-600">{signal.description}</p>
                                  {signal.recommendation && (
                                    <p className="mt-2 text-sm text-blue-600">
                                      Recommendation: {signal.recommendation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confidence */}
                    {latestReview.confidenceLevel !== undefined && (
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Analysis Confidence</h2>
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full border-4 border-blue-200 bg-blue-50 flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">
                              {Math.round(latestReview.confidenceLevel * 100)}%
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            The AI is {Math.round(latestReview.confidenceLevel * 100)}% confident in this analysis.
                            Lower confidence scores suggest manual review may be beneficial.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="space-y-6">
                    {/* Documents List */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h2 className="mb-4 text-lg font-semibold text-slate-900">
                        Uploaded Documents ({app.documents.length})
                      </h2>
                      <div className="space-y-3">
                        {app.documents.map((doc) => {
                          const classification = latestReview?.documentClassifications?.find(
                            (c) => c.documentId === doc.id || c.filename === doc.filename
                          );
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200">
                                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{doc.filename}</p>
                                  <p className="text-xs text-slate-500">
                                    {doc.mimeType} • {(doc.sizeBytes / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {classification && (
                                  <>
                                    <DocumentTypeBadge type={classification.type} />
                                    <span className="text-xs text-slate-500">
                                      {Math.round(classification.confidence * 100)}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-6 text-lg font-semibold text-slate-900">Activity Timeline</h2>
                    <div>
                      {app.auditEvents.map((event, idx) => (
                        <TimelineEvent
                          key={`${event.action}-${event.createdAt}`}
                          event={event}
                          isLast={idx === app.auditEvents.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                {(role === "reviewer" || role === "admin") && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-slate-900">Quick Actions</h3>
                    <textarea
                      className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400"
                      rows={3}
                      placeholder="Add decision notes..."
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitDecision("approved")}
                        disabled={loading}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => submitDecision("flagged")}
                        disabled={loading}
                        className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                      >
                        Flag
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Your decision will override the AI recommendation and be logged in the audit trail.
                    </p>
                  </div>
                )}

                {/* Status Summary */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-semibold text-slate-900">Status Summary</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Current Status</dt>
                      <dd><StatusBadge status={app.status} size="sm" /></dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Documents</dt>
                      <dd className="font-medium text-slate-900">{app.documents.length}</dd>
                    </div>
                    {latestReview && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Risk Score</dt>
                          <dd className="font-medium text-slate-900">
                            {Math.round(latestReview.fraudScore * 100)}%
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">AI Recommendation</dt>
                          <dd className="font-medium capitalize text-slate-900">
                            {latestReview.recommendedAction ?? "—"}
                          </dd>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Events</dt>
                      <dd className="font-medium text-slate-900">{app.auditEvents.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
