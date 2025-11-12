import { PdfUploader } from '@/components/PdfUploader'

export default function Page() {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">PDF Cut/Del</h1>
            PDF Cut, Name, Delete v1.0
            <img 
              src="https://skale.dev/wp-content/uploads/2024/02/skale_redwhite-e1708931820958.png" 
              alt="Logo" 
              className="w-24 h-auto filter grayscale"
            />
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <PdfUploader />
          </div>
        </main>
      </div>
    )
  }