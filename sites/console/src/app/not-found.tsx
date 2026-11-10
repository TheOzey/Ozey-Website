import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Page not found</h1>
      <p className="text-sm text-muted">This page does not exist in the Ozey Console.</p>
      <Link href="/" className="mt-2 text-sm font-medium text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
