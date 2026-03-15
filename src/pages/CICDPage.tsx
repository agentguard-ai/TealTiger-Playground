import { useState } from 'react';

const TEMPLATES = [
  { id: 'basic', name: 'Basic Policy Test', desc: 'Run policy tests on every PR' },
  { id: 'full', name: 'Full CI/CD Pipeline', desc: 'Test, lint, build, and deploy policies' },
  { id: 'staging', name: 'Staging Deploy', desc: 'Auto-deploy approved policies to staging' },
];

export function CICDPage() {
  const [selected, setSelected] = useState('basic');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CI/CD Integration</h1>
        <p className="text-sm text-gray-500 mt-1">Generate GitHub Actions workflows for policy testing and deployment</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Workflow Templates</h2>
          <div className="space-y-2">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSelected(t.id)}
                className={`w-full text-left p-3 border rounded-lg transition-colors ${
                  selected === t.id ? 'border-teal-500 bg-teal-50' : 'hover:bg-gray-50'
                }`}>
                <p className="font-medium text-sm text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Generated Workflow</h2>
            <button className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700">Download YAML</button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
{`name: TealTiger Policy CI
on:
  pull_request:
    paths: ['policies/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:policies
      - run: npm run lint:policies
${selected === 'full' ? `
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy:policies` : ''}
${selected === 'staging' ? `
  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy:staging` : ''}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
