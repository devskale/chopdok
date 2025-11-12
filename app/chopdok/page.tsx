import { PdfUploader } from "@/components/PdfUploader";
import Image from "next/image";

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">PDF ChopDok</h1>
          Painless PDF Cutting
          <div className="relative w-24 h-24">
            <Image
              src="https://skale.dev/wp-content/uploads/2024/02/skale_redwhite-e1708931820958.png"
              alt="Logo"
              fill
              className="object-contain filter grayscale"
              priority
            />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <PdfUploader />
        </div>
      </main>
    </div>
  );
}
