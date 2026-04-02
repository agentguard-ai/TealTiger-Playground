import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

export function WorkspacesPage() {
  const { toasts, show } = useToast();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspace Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage team workspaces, members, and permissions</p>
        </div>
        <button className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700" onClick={() => show('Workspace creation coming in v1.2.0', 'info')}>+ New Workspace</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Team Members</h2>
          <div className="space-y-3">
            {[
              { name: 'Admin User', role: 'Owner', avatar: '👤' },
              { name: 'Security Lead', role: 'Editor', avatar: '🛡️' },
              { name: 'Dev Team', role: 'Editor', avatar: '💻' },
              { name: 'Auditor', role: 'Viewer', avatar: '📋' },
            ].map(m => (
              <div key={m.name} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span>{m.avatar}</span>
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  m.role === 'Owner' ? 'bg-purple-100 text-purple-800' :
                  m.role === 'Editor' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-700'
                }`}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Role Permissions</h2>
          <div className="space-y-3">
            {[
              { role: 'Owner', perms: 'Full access: members, settings, policies, audit' },
              { role: 'Editor', perms: 'Create, edit, submit policies for review' },
              { role: 'Viewer', perms: 'Read-only access to policies and audit logs' },
            ].map(r => (
              <div key={r.role} className="border rounded-lg p-3">
                <h3 className="font-medium text-gray-900 text-sm">{r.role}</h3>
                <p className="text-xs text-gray-500 mt-1">{r.perms}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
