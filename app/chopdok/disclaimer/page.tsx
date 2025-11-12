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
          <h2 className="text-lg font-semibold text-gray-900">ChopDok by skale.dev</h2>
          <p className="text-gray-700">
            This application is provided free of charge, strictly on an “as is” and “as available” basis.
            To the maximum extent permitted by applicable law, skale.dev disclaims all warranties, whether
            express, implied, statutory, or otherwise, including without limitation any implied warranties
            of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or
            error-free operation.
          </p>
          <p className="text-gray-700">
            Use is at your sole risk. In no event will skale.dev or the authors be liable for any direct,
            indirect, incidental, consequential, special, exemplary, or punitive damages, or for any loss
            of data, business interruption, loss of profits, or reputational harm arising out of or in
            connection with your use of the application, even if advised of the possibility of such damages.
          </p>
          <p className="text-gray-700">
            No data is stored or transmitted by ChopDok; all PDF handling and transformations occur locally
            within your browser. You are solely responsible for ensuring that you have the legal right to
            process the documents you upload and for safeguarding any sensitive or confidential information.
          </p>
          <p className="text-gray-700">
            You agree not to use ChopDok in violation of any law, regulation, or third‑party rights, and you
            acknowledge that you bear full responsibility for compliance. By continuing to use ChopDok, you
            signify your acceptance of this disclaimer and release skale.dev and the authors from any and all
            claims arising from your use of the application.
          </p>
        </div>
      </main>
    </div>
  );
}