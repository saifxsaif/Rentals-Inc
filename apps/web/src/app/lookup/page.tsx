"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LookupPage() {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!applicationId.trim()) {
      setError("Please enter an application ID");
      return;
    }

    // Navigate to the status page
    router.push(`/status/${applicationId.trim()}`);
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Application Lookup
          </h1>
          <p className="mt-3 text-slate-600">
            Enter your application ID to check your status and review results
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Application ID
            </span>
            <input
              type="text"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              placeholder="e.g., cml2fivdm000604ju52l499ue"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          {error && (
            <p className="mt-3 text-sm text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700"
          >
            Check Status
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">How it works</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                1
              </div>
              <p className="text-sm text-slate-600">
                Enter your application ID received after submission
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                2
              </div>
              <p className="text-sm text-slate-600">
                View your application status and AI analysis results
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                3
              </div>
              <p className="text-sm text-slate-600">
                Track the review process through the audit timeline
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
