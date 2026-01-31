"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Application = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  status: string;
  createdAt: string;
  documents: Array<{ id: string; filename: string }>;
  reviewResults?: Array<{
    fraudScore: number;
    summary: string;
    recommendedAction?: string;
  }>;
};

type ApplicationsResponse = {
  applications?: Application[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    flagged: "bg-rose-100 text-rose-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const RiskIndicator = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  const color =
    score >= 0.7
      ? "text-rose-600 bg-rose-100"
      : score >= 0.4
        ? "text-amber-600 bg-amber-100"
        : "text-emerald-600 bg-emerald-100";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {percentage}% risk
    </span>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "applicant") {
        router.push("/");
      }
    }
  }, [authLoading, user, router]);

  const fetchApplications = async (resetOffset = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "20");
      params.set("offset", resetOffset ? "0" : String(pagination.offset));

      const res = await fetch(`${apiBaseUrl}/api/applications/list?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error ?? `Error: ${res.status}`);
        setApplications([]);
        return;
      }

      const json = (await res.json()) as ApplicationsResponse;

      if (json.error) {
        setError(json.error);
        setApplications([]);
      } else {
        setApplications(json.applications ?? []);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch applications. Please try again.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "reviewer" || user.role === "admin")) {
      fetchApplications(true); // Reset offset when filter changes
    }
  }, [statusFilter, user]);

  const stats = useMemo(() => {
    const pending = applications.filter(
      (a) => a.status === "submitted" || a.status === "under_review"
    ).length;
    const flagged = applications.filter((a) => a.status === "flagged").length;
    const approved = applications.filter((a) => a.status === "approved").length;

    return { pending, flagged, approved, total: applications.length };
  }, [applications]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!user || user.role === "applicant") {
    return null;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Application Dashboard
          </h1>
          <p className="mt-1 text-slate-600">
            Review and manage rental applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Total</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Pending</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Approved</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{stats.approved}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Flagged</p>
            <p className="mt-1 text-3xl font-bold text-rose-600">{stats.flagged}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filter:</span>
          {["all", "under_review", "flagged", "approved"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                statusFilter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </button>
          ))}
          <button
            onClick={() => fetchApplications(false)}
            className="ml-auto rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        )}

        {/* Applications Table */}
        {!loading && applications.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{app.applicantName}</p>
                      <p className="text-sm text-slate-500">{app.applicantEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4">
                      {app.reviewResults?.[0] ? (
                        <RiskIndicator score={app.reviewResults[0].fraudScore} />
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/status/${app.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && applications.length === 0 && !error && (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <p className="text-lg font-medium text-slate-900">No applications found</p>
            <p className="mt-2 text-sm text-slate-500">
              {statusFilter !== "all"
                ? `No applications with status "${statusFilter.replace("_", " ")}"`
                : "Applications will appear here when submitted"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
