import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, format } from 'date-fns';

export default function PlanExpiryAlertsWidget() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const getExpiryUrgency = (daysRemaining) => {
    if (daysRemaining <= 30) return { level: 'critical', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle };
    if (daysRemaining <= 60) return { level: 'high', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle };
    if (daysRemaining <= 90) return { level: 'medium', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock };
    return null;
  };

  const upcomingExpiries = clients
    .filter(c => c.plan_end_date && c.status === 'active')
    .map(c => ({
      ...c,
      daysRemaining: differenceInDays(new Date(c.plan_end_date), new Date())
    }))
    .filter(c => c.daysRemaining <= 90 && c.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const criticalCount = upcomingExpiries.filter(c => c.daysRemaining <= 30).length;
  const highCount = upcomingExpiries.filter(c => c.daysRemaining > 30 && c.daysRemaining <= 60).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Plan Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Plan Expiry Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Badges */}
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {criticalCount} Critical (≤30 days)
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800">
              {highCount} High (≤60 days)
            </Badge>
          )}
          {upcomingExpiries.length === 0 && (
            <p className="text-sm text-slate-500">No plans expiring in next 90 days</p>
          )}
        </div>

        {/* Expiry List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {upcomingExpiries.slice(0, 10).map(client => {
            const urgency = getExpiryUrgency(client.daysRemaining);
            const Icon = urgency?.icon || Clock;
            
            return (
              <div
                key={client.id}
                className={`p-3 rounded-lg border ${urgency?.color || 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3 w-3" />
                      <p className="font-medium text-sm">{client.full_name}</p>
                    </div>
                    <p className="text-xs opacity-75">
                      Expires: {format(new Date(client.plan_end_date), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs font-semibold mt-1">
                      {client.daysRemaining} days remaining
                    </p>
                  </div>
                  <Link to={`${createPageUrl('ClientDetail')}?clientId=${client.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {upcomingExpiries.length > 10 && (
          <p className="text-xs text-slate-500 text-center pt-2">
            +{upcomingExpiries.length - 10} more plans expiring soon
          </p>
        )}
      </CardContent>
    </Card>
  );
}