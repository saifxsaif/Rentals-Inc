"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type Application = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  status: string;
  createdAt: string;
  documents: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  reviewResults?: Array<{
    fraudScore: number;
    summary: string;
    aiNotes?: string;
    signals?: Array<{
      code: string;
      description: string;
      severity?: string;
      recommendation?: string;
    }>;
    documentClassifications?: Array<{
      filename: string;
      documentType: string;
      confidence: number;
    }>;
    recommendedAction?: string;
    confidenceLevel?: number;
    isAiGenerated?: boolean;
  }>;
  auditEvents?: Array<{
    id: string;
    action: string;
    actorRole: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700 border-blue-200",
    under_review: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    flagged: "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors: Record<string, string> = {
    high: "bg-rose-100 text-rose-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[severity] ?? "bg-slate-100 text-slate-600"}`}>
      {severity}
    </span>
  );
};

const RiskMeter = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  const color = score >= 0.7 ? "bg-rose-500" : score >= 0.4 ? "bg-amber-500" : "bg-emerald-500";
  const label = score >= 0.7 ? "High Risk" : score >= 0.4 ? "Medium Risk" : "Low Risk";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono font-semibold">{percentage}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default function StatusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const id = params.id as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "documents" | "timeline">("overview");
  const [decision, setDecision] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (id && user) {
      fetchApplication();
    }
  }, [id, user]);

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/applications/${id}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setApplication(json.application);
      }
    } catch {
      setError("Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/applications/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision, notes: decisionNotes }),
      });
      if (res.ok) {
        await fetchApplication();
        setDecision("");
        setDecisionNotes("");
      }
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-medium text-rose-800">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-rose-600 underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const review = application.reviewResults?.[0];
  const canDecide = user.role === "reviewer" || user.role === "admin";

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{application.applicantName}</h1>
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-slate-500">{application.id}</p>
          </div>
          <Link
            href={canDecide ? "/dashboard" : "/my-applications"}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["overview", "ai", "documents", "timeline"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "ai" ? "AI Analysis" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Contact</h3>
                  <p className="mt-1 text-slate-900">{application.applicantEmail}</p>
                  {application.applicantPhone && (
                    <p className="text-slate-600">{application.applicantPhone}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Submitted</h3>
                  <p className="mt-1 text-slate-900">
                    {new Date(application.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {review && (
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Risk Assessment</h3>
                  <RiskMeter score={review.fraudScore} />
                  <div className="mt-4 rounded-lg bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">{review.summary}</p>
                  </div>
                </div>
              )}

              {/* Decision section for reviewers/admins */}
              {canDecide && (
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Make Decision</h3>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {["approved", "flagged", "under_review"].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDecision(d)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            decision === d
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {d.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Add notes (optional)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      rows={3}
                    />
                    <button
                      onClick={handleDecision}
                      disabled={!decision || submitting}
                      className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Decision"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6">
              {review ? (
                <>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-900">AI Analysis Notes</h3>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {review.aiNotes ?? review.summary}
                      </p>
                    </div>
                  </div>

                  {review.signals && review.signals.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-slate-900">Detected Signals</h3>
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {review.signals.map((signal, idx) => (
                          <div key={idx} className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-slate-900">{signal.code}</span>
                              {signal.severity && <SeverityBadge severity={signal.severity} />}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{signal.description}</p>
                            {signal.recommendation && (
                              <p className="mt-2 text-xs text-slate-500">
                                <span className="font-medium">Recommendation:</span> {signal.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {review.confidenceLevel !== undefined && (
                    <div className="rounded-lg bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">
                        AI Confidence: {Math.round(review.confidenceLevel * 100)}%
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500">No AI analysis available</p>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Uploaded Documents</h3>
              {application.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">{doc.filename}</p>
                    <p className="text-sm text-slate-500">
                      {doc.mimeType} • {(doc.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Activity Timeline</h3>
              {application.auditEvents && application.auditEvents.length > 0 ? (
                <div className="space-y-4">
                  {application.auditEvents.map((event) => (
                    <div key={event.id} className="flex gap-4 border-l-2 border-slate-200 pl-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {event.action.replace("_", " ")}
                        </p>
                        <p className="text-sm text-slate-500">
                          by {event.actorRole} • {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No activity recorded</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
