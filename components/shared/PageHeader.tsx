"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  trailing?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  showBack = true,
  backHref,
  trailing,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      void router.push(backHref);
      return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      void router.push("/");
    }
  };

  return (
    <header
      className={cn(
        "bg-gradient-to-b from-emerald-700 to-emerald-600 px-5 pb-5 pt-7 text-white",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 bg-white/15 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        )}

        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-3"
          aria-label="AgriFlow home"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 transition group-active:scale-95">
            <img src="/logo.png" alt="AgriFlow" className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium uppercase tracking-widest text-emerald-100/85">
              {eyebrow}
            </span>
            <span className="block truncate text-xl font-bold">{title}</span>
            {subtitle && (
              <span className="mt-0.5 block truncate text-sm text-emerald-100/90">
                {subtitle}
              </span>
            )}
          </span>
        </Link>

        {trailing && (
          <div className="ml-auto flex shrink-0 items-center self-start">
            {trailing}
          </div>
        )}
      </div>
    </header>
  );
}
