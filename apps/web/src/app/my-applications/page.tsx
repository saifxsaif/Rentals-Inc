"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Application = {
  id: string;
  applicantName: string;
  status: string;
  createdAt: string;
  documents: Array<{ id: string; filename: string }>;
  reviewResults?: Array<{
    fraudScore: number;
    summary: string;
  }>;
};

type ApplicationsResponse = {
  applications?: Application[];
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

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/applications/list`, {
        credentials: "include",
      });
      const json = (await res.json()) as ApplicationsResponse;
      if (json.error) {
        setError(json.error);
      } else {
        setApplications(json.applications ?? []);
      }
    } catch {
      setError("Failed to load applications");
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="mt-1 text-slate-600">Track the status of your rental applications</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <p className="text-lg font-medium text-slate-900">No applications yet</p>
            <p className="mt-2 text-sm text-slate-500">Submit your first rental application to get started</p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply Now
            </Link>
          </div>
        )}

        {!loading && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm text-slate-500">{app.id}</p>
                    <p className="mt-1 font-medium text-slate-900">{app.applicantName}</p>
                    <p className="text-sm text-slate-500">
                      Submitted {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                {app.reviewResults?.[0] && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">{app.reviewResults[0].summary}</p>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/status/${app.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
