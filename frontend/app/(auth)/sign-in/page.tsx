import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

const reasons: Record<string, string> = {
  expired: "Your session has ended. Sign in again to continue.",
  "signed-out": "You have been signed out.",
};

async function Notice({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const { reason, next } = await searchParams;
  const message = typeof reason === "string" ? reasons[reason] : undefined;
  return (
    <>
      {message && (
        <p
          role="status"
          className="mb-6 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          {message}
        </p>
      )}
      <SignInForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <>
      <h1 className="mb-1 text-2xl">Sign in</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Create one
        </Link>
        .
      </p>
      <Suspense fallback={<SignInForm />}>
        <Notice searchParams={searchParams} />
      </Suspense>
    </>
  );
}
