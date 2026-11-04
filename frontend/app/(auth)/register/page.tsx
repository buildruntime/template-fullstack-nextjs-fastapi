import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl">Create an account</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/sign-in" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
        .
      </p>
      <RegisterForm />
    </>
  );
}
