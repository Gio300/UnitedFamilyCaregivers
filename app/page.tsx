import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-slate-50 font-sans">
      <main className="flex flex-1 w-full max-w-2xl flex-col items-center justify-center py-24 px-8 sm:px-12">
        <div className="text-center sm:text-left w-full">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">
            United Family Caregivers
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-md">
            NV Care Solutions Inc. – Serving Nevada and Arizona.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-slate-800 text-white px-6 py-3 font-medium hover:bg-slate-700 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 text-slate-700 px-6 py-3 font-medium hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
