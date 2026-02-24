import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

/**
 * Referral Pipeline
 * 
 * Automated referral intake and conversion workflow.
 * Optimized for rapid triage and practitioner assignment.
 */

export default function ReferralPipeline() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [selectedReferral, setSelectedReferral] = useState(null);

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.ReferralIntake.list('-received_date', 100)
  });

  const processReferralMutation = useMutation({
    mutationFn: async ({ referral_id, action, notes }) => {
      const { data } = await base44.functions.invoke('processReferralIntake', {
        referral_id,
        action,
        notes
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedReferral(null);
    }
  });

  const referralsByStatus = {
    new: referrals.filter(r => r.status === 'new'),
    screening: referrals.filter(r => r.status === 'screening'),
    accepted: referrals.filter(r => r.status === 'accepted'),
    waitlist: referrals.filter(r => r.status === 'waitlist'),
    converted: referrals.filter(r => r.status === 'converted')
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      screening: 'bg-yellow-100 text-yellow-700',
      awaiting_info: 'bg-orange-100 text-orange-700',
      accepted: 'bg-green-100 text-green-700',
      waitlist: 'bg-slate-100 text-slate-700',
      declined: 'bg-red-100 text-red-700',
      converted: 'bg-teal-100 text-teal-700'
    };
    return colors[status] || colors.new;
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700',
      priority: 'bg-orange-100 text-orange-700',
      routine: 'bg-slate-100 text-slate-700'
    };
    return colors[urgency] || colors.routine;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            "text-2xl font-bold transition-colors duration-300",
            isDark ? "text-slate-50" : "text-slate-900"
          )}>
            Referral Pipeline
          </h2>
          <p className={cn(
            "mt-1 transition-colors duration-300",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>
            Automated intake screening and client conversion
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  New Referrals
                </p>
                <p className="text-3xl font-bold mt-2">{referralsByStatus.new.length}</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  In Screening
                </p>
                <p className="text-3xl font-bold mt-2">{referralsByStatus.screening.length}</p>
              </div>
              <Filter className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Converted
                </p>
                <p className="text-3xl font-bold mt-2">{referralsByStatus.converted.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Conversion Rate
                </p>
                <p className="text-3xl font-bold mt-2">
                  {referrals.length > 0 
                    ? Math.round((referralsByStatus.converted.length / referrals.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Cards */}
      <div className="grid grid-cols-1 gap-4">
        {referrals.slice(0, 20).map((referral) => (
          <Card key={referral.id} className={cn(
            "transition-colors duration-300",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
          )}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(referral.status)}>
                      {referral.status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge className={getUrgencyColor(referral.urgency)}>
                      {referral.urgency}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{referral.participant_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {referral.service_requested} • {referral.referral_source}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                    Referrer
                  </p>
                  <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                    {referral.referrer_name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                    Contact
                  </p>
                  <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                    {referral.contact_name}
                  </p>
                </div>
                <div>
                  <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                    Funding
                  </p>
                  <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                    ${referral.funding_available?.toLocaleString() || 'TBD'}
                  </p>
                </div>
                <div>
                  <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                    Received
                  </p>
                  <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                    {new Date(referral.received_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              {referral.status === 'new' && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processReferralMutation.mutate({
                      referral_id: referral.id,
                      action: 'screen'
                    })}
                    disabled={processReferralMutation.isPending}
                    className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    AI Screen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => processReferralMutation.mutate({
                      referral_id: referral.id,
                      action: 'accept'
                    })}
                    disabled={processReferralMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 touch-manipulation select-none min-h-[44px] md:min-h-0"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processReferralMutation.mutate({
                      referral_id: referral.id,
                      action: 'waitlist'
                    })}
                    disabled={processReferralMutation.isPending}
                    className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Waitlist
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => processReferralMutation.mutate({
                      referral_id: referral.id,
                      action: 'decline'
                    })}
                    disabled={processReferralMutation.isPending}
                    className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}