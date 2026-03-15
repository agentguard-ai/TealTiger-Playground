import { TemplateLibrary } from '../components/Templates';

export function TemplatesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policy Templates</h1>
        <p className="text-sm text-gray-500 mt-1">15+ enterprise-ready templates to get started quickly</p>
      </div>
      <TemplateLibrary />
    </div>
  );
}
