import React from 'react';
import CustomDashboard from '@/components/reports/CustomDashboard';
import RequireRole from '@/components/auth/RequireRole';

export default function CustomDashboardPage() {
  return (
    <RequireRole roles={['admin']}>
      <CustomDashboard />
    </RequireRole>
  );
}