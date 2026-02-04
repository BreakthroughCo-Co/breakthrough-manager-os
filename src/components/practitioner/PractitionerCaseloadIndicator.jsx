import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PractitionerCaseloadIndicator({ practitionerId, compact = false }) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['practitionerCaseload', practitionerId],
    queryFn: () => base44.entities.Client.filter({ assigned_practitioner_id: practitionerId }),
    enabled: !!practitionerId
  });

  if (isLoading) {
    return <span className="text-xs text-slate-500">Loading...</span>;
  }

  const activeCaseload = clients.filter(c => c.status === 'active').length;
  const totalCaseload = clients.length;

  // Define thresholds for caseload alerts
  const isHighCaseload = activeCaseload >= 15;
  const isNearCapacity = activeCaseload >= 12;

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <Users className="h-3 w-3" />
        <span className={cn(
          isHighCaseload ? "text-red-600 font-semibold" :
          isNearCapacity ? "text-amber-600 font-medium" :
          "text-slate-600"
        )}>
          {activeCaseload} active
        </span>
        {isHighCaseload && <AlertCircle className="h-3 w-3 text-red-600" />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-600">Current Caseload</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div>
          <p className={cn(
            "text-2xl font-bold",
            isHighCaseload ? "text-red-600" :
            isNearCapacity ? "text-amber-600" :
            "text-slate-900"
          )}>
            {activeCaseload}
          </p>
          <p className="text-xs text-slate-500">Active clients</p>
        </div>
        
        {isHighCaseload && (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            High Caseload
          </Badge>
        )}
        {isNearCapacity && !isHighCaseload && (
          <Badge className="bg-amber-100 text-amber-800">
            Near Capacity
          </Badge>
        )}
      </div>

      {totalCaseload > activeCaseload && (
        <p className="text-xs text-slate-500">
          {totalCaseload - activeCaseload} additional client(s) (non-active)
        </p>
      )}

      {/* Availability indicator */}
      <div className="pt-2 border-t">
        <p className="text-xs text-slate-600">
          <strong>Status:</strong>{' '}
          {isHighCaseload ? (
            <span className="text-red-600 font-semibold">At capacity - review before new assignments</span>
          ) : isNearCapacity ? (
            <span className="text-amber-600 font-medium">Approaching capacity - limited availability</span>
          ) : (
            <span className="text-green-600">Available for new clients</span>
          )}
        </p>
      </div>
    </div>
  );
}