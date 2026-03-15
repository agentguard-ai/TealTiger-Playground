import { NavLink } from 'react-router-dom';

const navItems = [
  {
    section: 'Core',
    items: [
      { to: '/', label: 'Playground', icon: '⚡' },
      { to: '/policies', label: 'Policy Registry', icon: '📋' },
      { to: '/templates', label: 'Templates', icon: '📦' },
    ],
  },
  {
    section: 'Governance',
    items: [
      { to: '/governance', label: 'Approvals', icon: '✅' },
      { to: '/impact', label: 'Impact Analysis', icon: '📊' },
      { to: '/environments', label: 'Environments', icon: '🌐' },
    ],
  },
  {
    section: 'Compliance',
    items: [
      { to: '/compliance', label: 'Framework Mapping', icon: '🛡️' },
      { to: '/compliance/reports', label: 'Reports', icon: '📄' },
      { to: '/audit', label: 'Audit Trail', icon: '📜' },
    ],
  },
  {
    section: 'Enterprise',
    items: [
      { to: '/workspaces', label: 'Workspaces', icon: '🏢' },
      { to: '/rbac', label: 'RBAC Simulator', icon: '🔐' },
      { to: '/analytics', label: 'Analytics', icon: '📈' },
      { to: '/cicd', label: 'CI/CD', icon: '🔄' },
      { to: '/sharing', label: 'Policy Sharing', icon: '🔗' },
    ],
  },
];

export function EnterpriseSidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col h-full overflow-y-auto border-r border-gray-700">
      <div className="px-4 py-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-teal-400">🐯 TealTiger</h1>
        <p className="text-xs text-gray-500 mt-0.5">Enterprise Playground</p>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((section) => (
          <div key={section.section} className="mb-2">
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {section.section}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-400 border-r-2 border-teal-400'
                      : 'hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
