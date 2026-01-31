"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";

type Role = "applicant" | "reviewer" | "admin";

type SubmissionState = {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  monthlyIncome: string;
  employmentType: string;
  moveInDate: string;
  role: Role;
};

type SubmissionResponse = {
  application?: {
    id: string;
    status: string;
    reviewResults?: Array<{
      fraudScore: number;
      summary: string;
      recommendedAction?: string;
    }>;
  };
  error?: string;
};

const defaultState: SubmissionState = {
  applicantName: "",
  applicantEmail: "",
  applicantPhone: "",
  monthlyIncome: "",
  employmentType: "full-time",
  moveInDate: "",
  role: "applicant",
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700 border-blue-200",
    under_review: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    flagged: "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
};

export default function Home() {
  const [state, setState] = useState<SubmissionState>(defaultState);
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SubmissionResponse | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  const handleChange =
    (field: keyof SubmissionState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }
    setDocuments(Array.from(event.target.files));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResponse(null);
    setApplicationId(null);

    try {
      const payload = {
        applicantName: state.applicantName,
        applicantEmail: state.applicantEmail,
        applicantPhone: state.applicantPhone || undefined,
        documents: documents.map((file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        })),
      };

      const res = await fetch(`${apiBaseUrl}/api/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": state.role,
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as SubmissionResponse;
      setResponse(json);
      setApplicationId(json.application?.id ?? null);
    } catch (error) {
      setResponse({ error: "Submission failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setState(defaultState);
    setDocuments([]);
    setResponse(null);
    setApplicationId(null);
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            AI-Powered Document Analysis
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Rental Application
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Submit your application with supporting documents. Our AI will
            analyze your submission for faster processing.
          </p>
        </div>

        {/* Info Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">Required Docs</h3>
            <p className="mt-1 text-sm text-slate-600">
              ID, paystub, and employment letter
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">Fast Processing</h3>
            <p className="mt-1 text-sm text-slate-600">
              AI reviews in under 30 seconds
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900">Fraud Detection</h3>
            <p className="mt-1 text-sm text-slate-600">
              Advanced AI security checks
            </p>
          </div>
        </div>

        {/* Application Form */}
        <form
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="mb-6 border-b border-slate-100 pb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Personal Information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Please provide your contact details
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Full Name <span className="text-rose-500">*</span>
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={state.applicantName}
                onChange={handleChange("applicantName")}
                placeholder="John Doe"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Email Address <span className="text-rose-500">*</span>
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="email"
                value={state.applicantEmail}
                onChange={handleChange("applicantEmail")}
                placeholder="john@example.com"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Phone Number
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="tel"
                value={state.applicantPhone}
                onChange={handleChange("applicantPhone")}
                placeholder="+1 (555) 123-4567"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Monthly Income
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="text"
                value={state.monthlyIncome}
                onChange={handleChange("monthlyIncome")}
                placeholder="$5,000"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Employment Type
              </span>
              <select
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={state.employmentType}
                onChange={handleChange("employmentType")}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="self-employed">Self-employed</option>
                <option value="retired">Retired</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Preferred Move-in Date
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="date"
                value={state.moveInDate}
                onChange={handleChange("moveInDate")}
              />
            </label>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Supporting Documents
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload ID, income verification, and employment letter
            </p>
          </div>

          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition hover:border-blue-400 hover:bg-blue-50/50">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-700">
                {documents.length > 0
                  ? `${documents.length} file(s) selected`
                  : "Click to upload or drag and drop"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                PDF, JPG, PNG up to 10MB each
              </span>
              <input
                className="hidden"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFiles}
                required
              />
            </label>

            {documents.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {documents.map((file, index) => (
                  <li key={index} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Role selector for demo/testing */}
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Demo Mode</p>
                <p className="mt-1 text-xs text-amber-700">
                  Select a role to test RBAC. In production, this would be determined by authentication.
                </p>
                <select
                  className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm"
                  value={state.role}
                  onChange={handleChange("role")}
                >
                  <option value="applicant">Applicant</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting & Analyzing...
              </span>
            ) : (
              "Submit Application"
            )}
          </button>
        </form>

        {/* Response Section */}
        {response && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {response.error && (
              <div className="border-l-4 border-rose-500 bg-rose-50 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-rose-800">Submission Failed</p>
                    <p className="mt-1 text-sm text-rose-700">{response.error}</p>
                  </div>
                </div>
              </div>
            )}

            {response.application && (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Application Submitted</p>
                      <p className="text-sm text-slate-500">AI analysis complete</p>
                    </div>
                  </div>
                  <StatusBadge status={response.application.status} />
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Application ID
                      </p>
                      <p className="mt-1 font-mono text-sm text-slate-900">
                        {response.application.id}
                      </p>
                    </div>
                    {response.application.reviewResults?.[0] && (
                      <>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Risk Score
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            {(response.application.reviewResults[0].fraudScore * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            AI Summary
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {response.application.reviewResults[0].summary}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {applicationId && (
                    <Link
                      href={`/status/${applicationId}`}
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      View Full Details
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Submit Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
