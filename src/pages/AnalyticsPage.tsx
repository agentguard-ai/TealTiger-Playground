export function AnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Usage metrics, cost tracking, and policy performance</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Evaluations', value: '12,847', change: '+18%', color: 'text-teal-600' },
          { label: 'Success Rate', value: '94.2%', change: '+2.1%', color: 'text-green-600' },
          { label: 'Total Cost', value: '$42.18', change: '-5%', color: 'text-blue-600' },
          { label: 'Avg Latency', value: '23ms', change: '-12%', color: 'text-purple-600' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-1">{m.change} vs last period</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Policies by Usage</h2>
          <div className="space-y-3">
            {[
              { name: 'PII Detection', evals: 4521, rate: '96%' },
              { name: 'Cost Control', evals: 3200, rate: '91%' },
              { name: 'Content Moderation', evals: 2890, rate: '98%' },
              { name: 'Rate Limiter', evals: 1456, rate: '89%' },
              { name: 'Prompt Guard', evals: 780, rate: '95%' },
            ].map((p, i) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{p.evals.toLocaleString()} evals</span>
                  <span className="text-green-600">{p.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h2>
          <div className="space-y-3">
            {[
              { provider: 'OpenAI', cost: '$28.50', pct: 68 },
              { provider: 'Anthropic', cost: '$9.20', pct: 22 },
              { provider: 'Gemini', cost: '$3.10', pct: 7 },
              { provider: 'Other', cost: '$1.38', pct: 3 },
            ].map(c => (
              <div key={c.provider}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-900">{c.provider}</span>
                  <span className="text-gray-500">{c.cost} ({c.pct}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
