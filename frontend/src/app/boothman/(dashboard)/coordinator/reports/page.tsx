import { FileText } from 'lucide-react';

export default function CoordinatorReportsPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="header">
        <h1>Booth Reports</h1>
      </header>
      <main className="content">
        <div className="card text-center py-16">
          <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reports & Analytics</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            This module is currently under development. Soon you will be able to view submitted incident reports and generate end-of-day booth summaries.
          </p>
        </div>
      </main>
    </div>
  );
}
