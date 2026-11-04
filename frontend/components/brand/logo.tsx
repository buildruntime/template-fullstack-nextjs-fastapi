import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The Buildruntime lockup, from the outlined brand files. The brand guide asks for the
 * outlined wordmark rather than live text, and for the horizontal lockup only.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label="Buildruntime, home"
    >
      <Image
        src="/brand/logo-horizontal-light.svg"
        alt=""
        width={123}
        height={24}
        className="h-5 w-auto dark:hidden"
        priority
        unoptimized
      />
      <Image
        src="/brand/logo-horizontal-dark.svg"
        alt=""
        width={123}
        height={24}
        className="hidden h-5 w-auto dark:block"
        priority
        unoptimized
      />
    </Link>
  );
}
