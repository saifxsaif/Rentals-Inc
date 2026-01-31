"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Role = "applicant" | "reviewer" | "admin";

type ApplicationResponse = {
  application?: {
    id: string;
    applicantName: string;
    applicantEmail: string;
    status: string;
    documents: Array<{
      id: string;
      filename: string;
      sizeBytes: number;
    }>;
    reviewResults: Array<{
      fraudScore: number;
      summary: string;
      signals?: Array<{ code: string; description: string }>;
    }>;
    auditEvents: Array<{
      action: string;
      actorRole: string;
      createdAt: string;
    }>;
  };
  error?: string;
};

type Decision = "approved" | "flagged";

export default function StatusPage() {
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : undefined;
  const [role, setRole] = useState<Role>("applicant");
  const [email, setEmail] = useState("");
  const [response, setResponse] = useState<ApplicationResponse | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState(false);

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
    setResponse(null);

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
    } catch (error) {
      setResponse({ error: "Failed to submit decision." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Application status
          </p>
          <h1 className="text-2xl font-semibold">{id ?? "Unknown ID"}</h1>
          <p className="text-sm text-slate-600">
            Use your role and applicant email to retrieve the record.
          </p>
        </header>

        <div className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Role
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="applicant">Applicant</option>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Applicant email (required for applicant role)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>

          <button
            className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
            onClick={fetchStatus}
            disabled={loading}
          >
            {loading ? "Loading..." : "Fetch status"}
          </button>
        </div>

        {(role === "reviewer" || role === "admin") && (
          <div className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Reviewer decision
              </p>
              <p className="text-sm text-slate-600">
                Override the automated workflow status if needed.
              </p>
            </div>
            <textarea
              className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Optional notes for audit trail"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
            />
            <div className="flex flex-col gap-3 md:flex-row">
              <button
                className="rounded-lg border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
                onClick={() => submitDecision("approved")}
                disabled={loading}
              >
                Approve
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => submitDecision("flagged")}
                disabled={loading}
              >
                Flag
              </button>
            </div>
          </div>
        )}

        {response?.error && (
          <div className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-600">
            {response.error}
          </div>
        )}

        {response?.application && (
          <div className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Applicant
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {response.application.applicantName}
              </p>
              <p className="text-sm text-slate-600">
                {response.application.applicantEmail}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Status
                </p>
                <p className="text-base font-semibold text-slate-900">
                  {response.application.status}
                </p>
              </div>
              {response.application.reviewResults[0] && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    AI Review
                  </p>
                  <p className="text-sm text-slate-600">
                    {response.application.reviewResults[0].summary}
                  </p>
                  <p className="text-xs text-slate-500">
                    Fraud score: {response.application.reviewResults[0].fraudScore.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Documents
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {response.application.documents.map((doc) => (
                  <li key={doc.id} className="flex justify-between">
                    <span>{doc.filename}</span>
                    <span>{Math.round(doc.sizeBytes / 1024)} KB</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Recent audit events
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {response.application.auditEvents.map((event) => (
                  <li key={`${event.action}-${event.createdAt}`}>
                    {event.action} • {event.actorRole}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
