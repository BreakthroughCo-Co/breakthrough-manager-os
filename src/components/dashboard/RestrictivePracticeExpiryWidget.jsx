import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';
import { Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const typeLabels = {
  seclusion: 'Seclusion',
  physical_restraint: 'Physical Restraint',
  mechanical_restraint: 'Mechanical Restraint',
  chemical_restraint: 'Chemical Restraint',
  environmental_restraint: 'Environmental Restraint',
};

export default function RestrictivePracticeExpiryWidget() {
  const { data: practices = [] } = useQuery({
    queryKey: ['rp-widget'],
    queryFn: () => base44.entities.RestrictivePractice.list(),
  });

  const flagged = practices
    .filter(p => p.authorisation_status !== 'expired')
    .map(p => ({
      ...p,
      daysToExpiry: p.expiry_date ? differenceInDays(new Date(p.expiry_date), new Date()) : null,
    }))
    .filter(p => {
      // Flag: unauthorised, or expiring within 30 days, or NDIS not notified on authorised
      return (
        p.authorisation_status === 'unauthorised' ||
        (p.daysToExpiry !== null && p.daysToExpiry <= 30) ||
        (p.authorisation_status === 'authorised' && !p.ndis_notified)
      );
    })
    .sort((a, b) => (a.daysToExpiry ?? 999) - (b.daysToExpiry ?? 999));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            Restrictive Practice Alerts
          </CardTitle>
          <Link to={createPageUrl('RestrictivePractices')}>
            <span className="text-xs text-teal-600 hover:underline cursor-pointer">Manage →</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {flagged.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            No urgent RP actions required
          </div>
        ) : (
          flagged.slice(0, 5).map(p => {
            const isUnauthorised = p.authorisation_status === 'unauthorised';
            const isUnnotified = p.authorisation_status === 'authorised' && !p.ndis_notified;
            const isExpiring = p.daysToExpiry !== null && p.daysToExpiry <= 30;

            return (
              <div key={p.id} className={cn(
                "px-3 py-2 rounded-lg text-sm border",
                isUnauthorised ? "bg-red-50 border-red-200" :
                isExpiring && p.daysToExpiry <= 7 ? "bg-amber-50 border-amber-200" :
                "bg-slate-50 border-slate-200"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.client_name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[p.practice_type]}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isUnauthorised && <Badge className="bg-red-100 text-red-700 text-xs">Unauthorised</Badge>}
                    {isUnnotified && <Badge className="bg-amber-100 text-amber-700 text-xs">NDIS Pending</Badge>}
                    {isExpiring && <Badge className="bg-orange-100 text-orange-700 text-xs">{p.daysToExpiry}d expiry</Badge>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {flagged.length > 5 && (
          <p className="text-xs text-muted-foreground text-right">+{flagged.length - 5} more</p>
        )}
      </CardContent>
    </Card>
  );
}