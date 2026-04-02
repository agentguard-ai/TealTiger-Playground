import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Playground', icon: '⚡' },
  { to: '/templates', label: 'Templates', icon: '📦' },
];

export function EnterpriseSidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col h-full overflow-y-auto border-r border-gray-700">
      <div className="px-4 py-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-teal-400">🐯 TealTiger</h1>
        <p className="text-xs text-gray-500 mt-0.5">Policy Playground</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
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
      </nav>
      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-[10px] text-gray-600">v1.1.0</p>
        <a
          href="https://docs.tealtiger.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-teal-500 hover:text-teal-400"
        >
          Documentation →
        </a>
      </div>
    </aside>
  );
}
