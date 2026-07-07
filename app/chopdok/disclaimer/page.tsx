import Link from "next/link";
import { ArrowLeft, Shield, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/chopdok" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to App</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Disclaimer & Privacy</h1>
            <p className="text-gray-500 text-lg">
              Transparency about how ChopDok handles your data.
            </p>
          </div>

          <div className="space-y-8">
            <section className="flex gap-4 items-start">
              <div className="p-2 bg-green-50 rounded-lg shrink-0 mt-1">
                <Lock className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">Local Processing Only</h3>
                <p className="text-gray-600 leading-relaxed">
                  ChopDok operates entirely within your web browser. Your PDF files are <strong>never uploaded</strong> to any server. All processing (splitting, deleting pages, renaming) happens locally on your device. This ensures your documents remain completely private and secure.
                </p>
              </div>
            </section>

            <section className="flex gap-4 items-start">
              <div className="p-2 bg-orange-50 rounded-lg shrink-0 mt-1">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">No Warranty</h3>
                <p className="text-gray-600 leading-relaxed">
                  This software is provided &quot;as is&quot;, without warranty of any kind, express or implied. While we strive for reliability, we cannot guarantee that the software will be error-free or suitable for every purpose. Please always keep a backup of your original documents.
                </p>
              </div>
            </section>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Technical Note</h4>
              <p className="text-sm text-gray-500">
                We use standard web technologies (PDF.js, pdf-lib) to manipulate files directly in your browser memory. Once you close the tab, all processed data is cleared from your browser&apos;s memory.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t flex justify-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/chopdok">
                I Understand, Take Me Back
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} skale.dev
      </footer>
    </div>
  );
}