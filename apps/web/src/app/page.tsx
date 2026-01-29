"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

type Role = "applicant" | "reviewer" | "admin";

type SubmissionState = {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  role: Role;
};

type SubmissionResponse = {
  application?: {
    id: string;
    status: string;
  };
  error?: string;
};

const defaultState: SubmissionState = {
  applicantName: "",
  applicantEmail: "",
  applicantPhone: "",
  role: "applicant",
};

export default function Home() {
  const [state, setState] = useState<SubmissionState>(defaultState);
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SubmissionResponse | null>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  const handleChange = (field: keyof SubmissionState) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
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
    } catch (error) {
      setResponse({ error: "Submission failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Rentals Inc
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Rental application intake
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Submit a rental application with supporting documents. Uploads are
            mocked for now; metadata is stored to drive the workflow.
          </p>
        </header>

        <form
          className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Full name
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={state.applicantName}
                onChange={handleChange("applicantName")}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email address
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                type="email"
                value={state.applicantEmail}
                onChange={handleChange("applicantEmail")}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Phone (optional)
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={state.applicantPhone}
                onChange={handleChange("applicantPhone")}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Role (for RBAC testing)
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={state.role}
                onChange={handleChange("role")}
              >
                <option value="applicant">Applicant</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Supporting documents
            <input
              className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-base"
              type="file"
              multiple
              onChange={handleFiles}
              required
            />
            <span className="text-xs text-slate-500">
              Recommended: ID, paystub, and employment letter.
            </span>
          </label>

          <button
            className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit application"}
          </button>
        </form>

        {response && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            {response.error && (
              <p className="text-sm font-medium text-rose-600">
                {response.error}
              </p>
            )}
            {response.application && (
              <div className="flex flex-col gap-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Submission complete</p>
                <p>Application ID: {response.application.id}</p>
                <p>Status: {response.application.status}</p>
                <a
                  className="mt-2 inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900"
                  href={`/status/${response.application.id}`}
                >
                  View status
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
