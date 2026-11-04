import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col px-5 sm:px-8">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center pt-[8vh] pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
