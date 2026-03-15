const DEMO_APPROVALS = [
  { id: '1', policy: 'Prompt Injection Guard', requester: 'dev-team', status: 'pending', approvers: ['admin', 'security-lead'], date: '2026-03-14', from: 'Draft', to: 'Review' },
  { id: '2', policy: 'Cost Control Budget', requester: 'admin', status: 'approved', approvers: ['cto'], date: '2026-03-12', from: 'Review', to: 'Approved' },
  { id: '3', policy: 'PII Detection', requester: 'admin', status: 'approved', approvers: ['security-lead', 'cto'], date: '2026-03-10', from: 'Approved', to: 'Production' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function GovernancePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Governance & Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">Policy approval workflows: Draft → Review → Approved → Production</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {['Draft', 'Review', 'Approved', 'Production'].map(state => (
          <div key={state} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{state === 'Production' ? 2 : state === 'Approved' ? 1 : state === 'Review' ? 1 : 1}</p>
            <p className="text-sm text-gray-500">{state}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm text-gray-600">Approval Requests</div>
        {DEMO_APPROVALS.map(a => (
          <div key={a.id} className="px-4 py-3 border-b flex items-center justify-between hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">{a.policy}</p>
              <p className="text-xs text-gray-500">{a.from} → {a.to} · by {a.requester} · {a.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
              <span className="text-xs text-gray-400">{a.approvers.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
