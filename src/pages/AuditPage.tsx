const DEMO_EVENTS = [
  { id: '1', action: 'policy.promoted', actor: 'admin', resource: 'PII Detection v2.1.0', timestamp: '2026-03-15 10:30:00', detail: 'Promoted to Production' },
  { id: '2', action: 'policy.approved', actor: 'security-lead', resource: 'Cost Control v1.3.0', timestamp: '2026-03-14 16:22:00', detail: 'Approved for staging' },
  { id: '3', action: 'member.added', actor: 'admin', resource: 'dev-team', timestamp: '2026-03-14 09:15:00', detail: 'Added as Editor to workspace' },
  { id: '4', action: 'policy.created', actor: 'dev-team', resource: 'Prompt Injection Guard', timestamp: '2026-03-13 14:00:00', detail: 'Created new policy v0.1.0' },
  { id: '5', action: 'policy.evaluated', actor: 'system', resource: 'Content Moderation v3.0.1', timestamp: '2026-03-13 11:45:00', detail: '150 evaluations, 2 blocked' },
  { id: '6', action: 'config.updated', actor: 'admin', resource: 'Workspace Settings', timestamp: '2026-03-12 08:30:00', detail: 'Required approvers changed to 2' },
];

const ACTION_ICONS: Record<string, string> = {
  'policy.promoted': '🚀',
  'policy.approved': '✅',
  'member.added': '👤',
  'policy.created': '📝',
  'policy.evaluated': '⚡',
  'config.updated': '⚙️',
};

export function AuditPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">Immutable log of all operations</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border hover:bg-gray-50">Export CSV</button>
          <button className="px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border hover:bg-gray-50">Export JSON</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {DEMO_EVENTS.map(e => (
          <div key={e.id} className="px-4 py-3 border-b hover:bg-gray-50 flex items-start gap-3">
            <span className="text-lg mt-0.5">{ACTION_ICONS[e.action] || '📋'}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm">{e.resource}</p>
                <span className="text-xs text-gray-400">{e.timestamp}</span>
              </div>
              <p className="text-xs text-gray-500">{e.detail} · by {e.actor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
