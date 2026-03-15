import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useTeamFeatures } from '@/hooks/useTeamFeatures';
import { SignInButton } from './SignInButton';

interface TeamFeatureGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showPrompt?: boolean;
}

/**
 * TeamFeatureGate component
 * 
 * Wraps team features and shows a sign-in prompt when not authenticated
 * Allows playground usage in anonymous mode while gating team features
 * 
 * Requirements: 2.10
 */
export function TeamFeatureGate({ 
  children, 
  fallback,
  showPrompt = true 
}: TeamFeatureGateProps) {
  const { isAvailable } = useTeamFeatures();

  if (isAvailable) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full mb-4">
        <Lock className="w-6 h-6 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Team Feature
      </h3>
      <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
        This feature requires authentication. Sign in with GitHub to access team collaboration features.
      </p>
      <SignInButton />
    </div>
  );
}
