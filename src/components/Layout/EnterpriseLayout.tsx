import { Outlet } from 'react-router-dom';
import { EnterpriseSidebar } from './EnterpriseSidebar';

export function EnterpriseLayout() {
  return (
    <div className="h-screen flex bg-gray-100">
      <EnterpriseSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
