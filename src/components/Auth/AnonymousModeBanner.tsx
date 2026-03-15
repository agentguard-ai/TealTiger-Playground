import { Info } from 'lucide-react';
import { SignInButton } from './SignInButton';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * AnonymousModeBanner component
 * 
 * Shows a banner prompting users to sign in for team features
 * Only displayed when user is not authenticated
 * 
 * Requirements: 2.10
 */
export function AnonymousModeBanner() {
  if (!isSupabaseConfigured()) {
    return null; // Don't show if Supabase is not configured
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 mb-1">
            Anonymous Mode
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            You're using the playground in anonymous mode. Sign in with GitHub to unlock team collaboration features:
          </p>
          <ul className="text-sm text-blue-700 mb-3 ml-4 list-disc space-y-1">
            <li>Save and version your policies</li>
            <li>Collaborate with team members</li>
            <li>Share policies across your organization</li>
            <li>Track policy changes with audit logs</li>
          </ul>
          <SignInButton />
        </div>
      </div>
    </div>
  );
}
