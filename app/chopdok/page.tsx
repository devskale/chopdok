import { PdfUploader } from "@/components/PdfUploader";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/choppr.png",
    apple: "/choppr.png",
  },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/choppr.png"
                alt="ChopDok icon"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight">ChopDok</h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <span>Painless PDF chopping, free, in-browser editing, no ads, no data collection</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-8 opacity-50 hover:opacity-100 transition-opacity">
              <Image
                src="https://skale.dev/wp-content/uploads/2024/02/skale_redwhite-e1708931820958.png"
                alt="Logo"
                fill
                className="object-contain filter grayscale"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <PdfUploader />
          </div>
        </div>
      </main>

      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold">ChopDok</span>
            <span>v1.7</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/chopdok/disclaimer"
              className="hover:text-gray-900 transition-colors">
              Disclaimer
            </Link>
            <span>&copy; {new Date().getFullYear()} skale.dev</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
