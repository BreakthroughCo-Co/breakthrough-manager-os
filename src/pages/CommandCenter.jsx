import React from 'react';
import CommandCenter from '@/components/dashboard/CommandCenter';

export default function CommandCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Breakthrough Command Center</h1>
        <p className="text-slate-600">Unified operational dashboard with role-based data synthesis.</p>
      </div>
      <CommandCenter />
    </div>
  );
}