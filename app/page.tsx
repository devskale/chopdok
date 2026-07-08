import { PdfUploader } from "@/components/PdfUploader";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BASE_PATH } from "@/lib/basePath";

export const metadata: Metadata = {
  icons: {
    icon: `${BASE_PATH}/choppr.png`,
    apple: `${BASE_PATH}/choppr.png`,
  },
};

export default function Page() {
  return (
    <div className="relative min-h-screen text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Image
                src={`${BASE_PATH}/choppr.png`}
                alt="ChopDok icon"
                fill
                sizes="2.25rem"
                className="object-contain p-2 dark:invert dark:opacity-90"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Chop<span className="text-gradient">Dok</span>
            </span>
          </div>
          <p className="hidden md:block text-sm text-muted-foreground/80">
            Free, in-browser PDF chopping — no uploads, no ads, no tracking
          </p>
          <div className="relative w-20 h-8 opacity-50 hover:opacity-100 transition-opacity">
            <Image
              src="https://skale.dev/logos/skalelogo_red_trans.png"
              alt="Logo"
              fill
              sizes="5rem"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 flex flex-col items-center">
        {/* Hero */}
        <div className="max-w-2xl text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            100% client-side · your files never leave the browser
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight">
            Chop PDFs <span className="text-gradient">elegantly</span> in your browser
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Split, delete, and rename pages — visually, instantly, and privately.
          </p>
        </div>

        {/* App */}
        <div className="w-full max-w-5xl">
          <PdfUploader />
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">ChopDok</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-xs">v1.8</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/disclaimer"
              className="text-muted-foreground hover:text-foreground transition-colors">
              Disclaimer
            </Link>
            <span className="text-muted-foreground/60">
              &copy; {new Date().getFullYear()} skale.dev
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
