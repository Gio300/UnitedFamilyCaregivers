"use client";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Registration Pending
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Your registration is pending supervisor approval. You will be able to access the full dashboard once approved.
        </p>
      </div>
    </div>
  );
}
