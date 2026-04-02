import { NavLink } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Playground',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/templates',
    label: 'Templates',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
];

export function EnterpriseSidebar() {
  return (
    <aside className="w-52 bg-[#0f172a] text-gray-400 flex flex-col h-full border-r border-gray-800">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <img src="/tealtiger-logo-64.png" alt="TealTiger" className="w-7 h-7 rounded-md" />
          <div>
            <span className="text-sm font-semibold text-white tracking-tight">TealTiger</span>
            <span className="text-[10px] text-gray-500 block leading-tight">Policy Playground</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-all ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400 font-medium'
                  : 'hover:bg-white/5 hover:text-gray-200'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 text-[10px] text-gray-600">
        <div className="flex items-center justify-between">
          <span>v1.1.0</span>
          <a
            href="https://docs.tealtiger.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-500 transition-colors"
          >
            Docs
          </a>
        </div>
      </div>
    </aside>
  );
}
