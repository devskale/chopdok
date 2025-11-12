import React from "react";

/**
 * Renders the disclaimer page for ChopDok.
 * Provides legal and usage information for the application.
 */
export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Disclaimer</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded p-6 space-y-4">
          <p className="text-gray-700">
            ChopDok is provided as-is without warranty of any kind. Use of this application is
            at your own risk. The authors and maintainers are not liable for any damages or
            data loss resulting from its use.
          </p>
          <p className="text-gray-700">
            Ensure you have appropriate rights to process and modify any PDF documents
            you upload. Do not upload sensitive or confidential materials unless you fully
            understand the implications.
          </p>
          <p className="text-gray-700">
            By continuing to use ChopDok, you agree to these terms.
          </p>
        </div>
      </main>
    </div>
  );
}