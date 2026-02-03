import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PageErrorBoundary from '@/components/errors/PageErrorBoundary';
import RequireRole from '@/components/auth/RequireRole';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
  </div>
);

export default function ProtectedPage({ 
  component: Component, 
  roles = [], 
  requireAuth = true 
}) {
  const WrappedComponent = (props) => (
    <PageErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {requireAuth ? (
          <RequireRole roles={roles}>
            <Component {...props} />
          </RequireRole>
        ) : (
          <Component {...props} />
        )}
      </Suspense>
    </PageErrorBoundary>
  );

  return WrappedComponent;
}