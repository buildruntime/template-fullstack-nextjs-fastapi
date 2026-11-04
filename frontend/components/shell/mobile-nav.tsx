"use client";

import { Menu } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav({ isAdmin, account }: { isAdmin: boolean; account: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-6 p-4">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Pages and account settings</SheetDescription>
        <Logo href="/dashboard" className="px-2.5 pt-1" />
        <SidebarNav isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
        <div className="mt-auto">{account}</div>
      </SheetContent>
    </Sheet>
  );
}
