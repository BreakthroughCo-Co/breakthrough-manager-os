import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';
import { UserCog, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function WorkerScreeningExpiryWidget() {
  const { data: screenings = [] } = useQuery({
    queryKey: ['workerScreenings-widget'],
    queryFn: () => base44.entities.WorkerScreening.list('-expiry_date'),
  });

  const atRisk = screenings
    .map(s => ({
      ...s,
      daysToExpiry: s.expiry_date ? differenceInDays(new Date(s.expiry_date), new Date()) : 9999,
    }))
    .filter(s => s.daysToExpiry < 60)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const expired = atRisk.filter(s => s.daysToExpiry < 0);
  const expiring = atRisk.filter(s => s.daysToExpiry >= 0);

  const typeLabels = {
    ndis_worker_screening: 'NDIS Screening',
    wwcc: 'WWCC',
    police_check: 'Police Check',
    first_aid: 'First Aid',
    cpr: 'CPR',
    manual_handling: 'Manual Handling',
    other: 'Other',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserCog className="w-4 h-4 text-blue-600" />
            Worker Screening Expiry
          </CardTitle>
          <Link to={createPageUrl('WorkerScreening')}>
            <span className="text-xs text-teal-600 hover:underline cursor-pointer">Manage →</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {atRisk.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            All screenings current
          </div>
        ) : (
          <>
            {atRisk.slice(0, 5).map(s => (
              <div key={s.id} className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                s.daysToExpiry < 0 ? "bg-red-50 border border-red-200" :
                s.daysToExpiry <= 14 ? "bg-amber-50 border border-amber-200" :
                "bg-slate-50 border border-slate-200"
              )}>
                <div>
                  <p className="font-medium">{s.staff_name}</p>
                  <p className="text-xs text-muted-foreground">{typeLabels[s.screening_type] || s.screening_type}</p>
                </div>
                <Badge className={cn(
                  "text-xs",
                  s.daysToExpiry < 0 ? "bg-red-100 text-red-700" :
                  s.daysToExpiry <= 14 ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {s.daysToExpiry < 0 ? `${Math.abs(s.daysToExpiry)}d overdue` : `${s.daysToExpiry}d`}
                </Badge>
              </div>
            ))}
            {atRisk.length > 5 && (
              <p className="text-xs text-muted-foreground text-right">+{atRisk.length - 5} more</p>
            )}
            <div className="flex gap-3 pt-1 text-xs text-muted-foreground border-t">
              <span className="text-red-600 font-medium">{expired.length} expired</span>
              <span className="text-amber-600 font-medium">{expiring.length} expiring</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}