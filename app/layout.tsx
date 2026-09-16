import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BASE_PATH } from "@/lib/basePath";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ChopDok — merge, split & reorder PDFs",
  description: "Assemble PDFs and images into one document — reorder, split, and export as PDF, free and entirely in your browser. No uploads, no ads, no data collection.",
  alternates: { canonical: "https://skale.dev/chopdok" },
  openGraph: {
    title: "ChopDok — merge, split & reorder PDFs",
    description: "Assemble PDFs and images into one document — reorder, split, and export as PDF. Free, private, in your browser.",
    url: "https://skale.dev/chopdok",
    siteName: "skale.dev Apps",
  },
  icons: {
    icon: `${BASE_PATH}/choppr.png`,
    apple: `${BASE_PATH}/choppr.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appJsonld = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ChopDok",
    url: "https://skale.dev/chopdok",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Assemble PDFs and images into one document — reorder, split, and export as PDF. Free, private, in your browser.",
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonld) }}
        />
        <Toaster />
      </body>
    </html>
  );
}
