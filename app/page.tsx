import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950 min-h-screen">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 sm:items-start">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          United Family Caregivers
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-md">
          NV Care Solutions Inc. – Serving Nevada and Arizona.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/UnitedFamilyCaregivers/login"
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/UnitedFamilyCaregivers/signup"
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-6 py-3 font-medium"
          >
            Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}
