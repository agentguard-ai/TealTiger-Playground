export function SharingPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policy Sharing & Discovery</h1>
        <p className="text-sm text-gray-500 mt-1">Browse, share, and discover community policies</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'PII Detection Pro', author: 'tealtiger-team', stars: 42, forks: 12, tags: ['security', 'pii'] },
          { name: 'Budget Guardian', author: 'cost-ops', stars: 38, forks: 8, tags: ['cost', 'budget'] },
          { name: 'Prompt Shield', author: 'security-lab', stars: 35, forks: 15, tags: ['security', 'injection'] },
          { name: 'Multi-Provider Router', author: 'infra-team', stars: 28, forks: 6, tags: ['routing', 'multi-provider'] },
          { name: 'GDPR Compliance Kit', author: 'eu-compliance', stars: 24, forks: 10, tags: ['compliance', 'gdpr'] },
          { name: 'Rate Limit Smart', author: 'perf-team', stars: 19, forks: 4, tags: ['performance', 'rate-limit'] },
        ].map(p => (
          <div key={p.name} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-gray-900">{p.name}</h3>
            <p className="text-xs text-gray-500 mt-1">by {p.author}</p>
            <div className="flex gap-3 mt-3 text-xs text-gray-500">
              <span>⭐ {p.stars}</span>
              <span>🔀 {p.forks}</span>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {p.tags.map(t => (
                <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
            <button className="mt-3 w-full px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700">Fork to Workspace</button>
          </div>
        ))}
      </div>
    </div>
  );
}
