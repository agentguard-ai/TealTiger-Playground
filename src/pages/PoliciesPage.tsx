import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const DEMO_POLICIES = [
  { id: '1', name: 'PII Detection & Redaction', state: 'Production', version: '2.1.0', author: 'admin', tags: ['security', 'pii'], updatedAt: '2026-03-10' },
  { id: '2', name: 'Cost Control Budget', state: 'Approved', version: '1.3.0', author: 'admin', tags: ['cost', 'budget'], updatedAt: '2026-03-12' },
  { id: '3', name: 'Prompt Injection Guard', state: 'Review', version: '1.0.0', author: 'dev-team', tags: ['security', 'injection'], updatedAt: '2026-03-14' },
  { id: '4', name: 'Rate Limiter', state: 'Draft', version: '0.1.0', author: 'dev-team', tags: ['performance'], updatedAt: '2026-03-15' },
  { id: '5', name: 'Content Moderation', state: 'Production', version: '3.0.1', author: 'admin', tags: ['moderation', 'safety'], updatedAt: '2026-03-08' },
];

const STATE_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Review: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-blue-100 text-blue-800',
  Production: 'bg-green-100 text-green-800',
};

export function PoliciesPage() {
  const [search, setSearch] = useState('');
  const { toasts, show } = useToast();
  const filtered = DEMO_POLICIES.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.includes(search.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Registry</h1>
          <p className="text-sm text-gray-500 mt-1">Manage, version, and review your policies</p>
        </div>
        <button className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700" onClick={() => show('Navigate to Playground to create a policy', 'info')}>+ New Policy</button>
      </div>
      <input
        type="text"
        placeholder="Search policies by name or tag..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Policy</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Author</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATE_COLORS[p.state]}`}>{p.state}</span></td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.version}</td>
                <td className="px-4 py-3 text-gray-600">{p.author}</td>
                <td className="px-4 py-3">{p.tags.map(t => <span key={t} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mr-1">{t}</span>)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
