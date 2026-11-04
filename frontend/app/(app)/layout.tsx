import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";

/*
 * The shell is static and prerendered. Only the parts that depend on the signed-in user stream
 * in behind <Suspense>, as Cache Components requires for anything that reads the session.
 */

function AccountSkeleton() {
  return (
    <div className="flex items-center gap-2.5 p-2">
      <Skeleton className="size-8 rounded-full" />
      <div className="grid flex-1 gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

async function Account() {
  const user = await requireUser();
  return <UserMenu user={user} />;
}

async function DesktopNav() {
  const user = await requireUser();
  return <SidebarNav isAdmin={user.role === "admin"} />;
}

async function PhoneNav() {
  const user = await requireUser();
  return <MobileNav isAdmin={user.role === "admin"} account={<UserMenu user={user} />} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-border bg-card/60 p-4 md:flex">
        <Logo href="/dashboard" className="px-2.5 pt-2" />
        <Suspense fallback={<SidebarNav isAdmin={false} />}>
          <DesktopNav />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={<AccountSkeleton />}>
            <Account />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border px-3 md:hidden">
          <Suspense fallback={<div className="size-9" />}>
            <PhoneNav />
          </Suspense>
          <Logo href="/dashboard" />
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8 md:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
