"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type SubmissionState = {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
};

type SubmissionResponse = {
  application?: {
    id: string;
    status: string;
    reviewResults?: Array<{
      fraudScore: number;
      summary: string;
    }>;
  };
  error?: string;
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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubmissionState>({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SubmissionResponse | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      setState((prev) => ({
        ...prev,
        applicantName: user.name,
        applicantEmail: user.email,
      }));
    }
  }, [user]);

  // Redirect if not logged in or not an applicant
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

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

  // If user is reviewer/admin, show different content
  if (user.role === "reviewer" || user.role === "admin") {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
          <p className="mt-2 text-slate-600">
            As a {user.role}, you can review applications from the dashboard.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleChange =
    (field: keyof SubmissionState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    setState({
      applicantName: user?.name ?? "",
      applicantEmail: user?.email ?? "",
      applicantPhone: "",
    });
    setDocuments([]);
    setResponse(null);
    setApplicationId(null);
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Submit Rental Application
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Upload your documents for AI-powered verification
          </p>
        </div>

        {/* Application Form */}
        <form
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="mb-6 border-b border-slate-100 pb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Your Information
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Full Name <span className="text-rose-500">*</span>
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={state.applicantName}
                onChange={handleChange("applicantName")}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Email <span className="text-rose-500">*</span>
              </span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="email"
                value={state.applicantEmail}
                onChange={handleChange("applicantEmail")}
                required
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-base text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="tel"
                value={state.applicantPhone}
                onChange={handleChange("applicantPhone")}
                placeholder="+1 (555) 123-4567"
              />
            </label>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Documents
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload ID, paystub, and employment letter
            </p>
          </div>

          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition hover:border-blue-400 hover:bg-blue-50/50">
              <span className="text-sm font-medium text-slate-700">
                {documents.length > 0
                  ? `${documents.length} file(s) selected`
                  : "Click to upload"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                PDF, JPG, PNG up to 10MB
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
                    <span className="text-sm text-slate-900">{file.name}</span>
                    <span className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        {/* Response Section */}
        {response && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {response.error && (
              <div className="border-l-4 border-rose-500 bg-rose-50 p-6">
                <p className="font-medium text-rose-800">Error</p>
                <p className="mt-1 text-sm text-rose-700">{response.error}</p>
              </div>
            )}

            {response.application && (
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Application Submitted</p>
                    <p className="text-sm text-slate-500">ID: {response.application.id}</p>
                  </div>
                  <StatusBadge status={response.application.status} />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {applicationId && (
                    <Link
                      href={`/status/${applicationId}`}
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-slate-800"
                    >
                      View Details
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
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
