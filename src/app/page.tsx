export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-8 font-sans">
      <div className="border border-slate-200 rounded-lg p-8 bg-white shadow-sm">
        <div className="inline-block px-3 py-1 bg-sky-100 text-sky-800 text-xs font-semibold rounded-full mb-4">
          Phase 1A: Foundation
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
          Custom Multi-Market LMS
        </h1>
        <p className="text-slate-600 mb-6">
          Architectural foundation initialized for modular professional BIM learning.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="border border-slate-200 rounded p-4 bg-slate-50">
            <h2 className="text-sm font-semibold uppercase text-slate-500 mb-1">Target Market 1</h2>
            <div className="text-xl font-bold text-slate-800">Singapore (SG)</div>
            <div className="text-sm text-slate-600">Currency: SGD | Timezone: Asia/Singapore</div>
          </div>
          <div className="border border-slate-200 rounded p-4 bg-slate-50">
            <h2 className="text-sm font-semibold uppercase text-slate-500 mb-1">Target Market 2</h2>
            <div className="text-xl font-bold text-slate-800">Malaysia (MY)</div>
            <div className="text-sm text-slate-600">Currency: MYR | Timezone: Asia/Kuala_Lumpur</div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">System Status</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-sm font-medium text-slate-700">Platform Foundation Active</span>
            <a 
              href="/api/health" 
              className="ml-auto text-xs text-sky-600 hover:text-sky-800 underline font-mono"
            >
              Check /api/health →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
