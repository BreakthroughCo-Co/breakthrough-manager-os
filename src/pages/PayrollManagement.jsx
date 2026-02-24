import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';

/**
 * Payroll Management
 * 
 * Centralized payroll processing with SCHADS Award interpretation.
 * Optimized for managerial oversight and compliance accuracy.
 */

export default function PayrollManagement() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ['payrollRuns'],
    queryFn: () => base44.entities.PayrollRun.list('-created_date', 20)
  });

  const { data: pendingTimesheets = [] } = useQuery({
    queryKey: ['pendingTimesheets'],
    queryFn: () => base44.entities.Timesheet.filter({ status: 'approved' })
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (params) => {
      const { data } = await base44.functions.invoke('processPayroll', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTimesheets'] });
    }
  });

  const syncToXeroMutation = useMutation({
    mutationFn: async (payrollRunId) => {
      const { data } = await base44.functions.invoke('syncXeroPayroll', {
        payroll_run_id: payrollRunId
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    }
  });

  const handleProcessPayroll = async () => {
    setProcessing(true);
    try {
      // Calculate dates for current pay period (fortnightly)
      const today = new Date();
      const periodEnd = new Date(today);
      periodEnd.setDate(today.getDate() - (today.getDay() + 6) % 7); // Last Sunday
      
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 13); // 14 days back
      
      const payDate = new Date(periodEnd);
      payDate.setDate(payDate.getDate() + 5); // Pay on Friday
      
      await processPayrollMutation.mutateAsync({
        pay_period_start: periodStart.toISOString().split('T')[0],
        pay_period_end: periodEnd.toISOString().split('T')[0],
        pay_date: payDate.toISOString().split('T')[0]
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700',
      calculating: 'bg-blue-100 text-blue-700',
      ready_for_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      completed: 'bg-teal-100 text-teal-700',
      failed: 'bg-red-100 text-red-700'
    };
    return colors[status] || colors.draft;
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
            Payroll Management
          </h2>
          <p className={cn(
            "mt-1 transition-colors duration-300",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>
            Automated payroll processing with SCHADS Award interpretation
          </p>
        </div>
        <Button
          onClick={handleProcessPayroll}
          disabled={processing || pendingTimesheets.length === 0}
          className="bg-teal-600 hover:bg-teal-700 touch-manipulation select-none min-h-[44px]"
        >
          {processing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Process Payroll
            </>
          )}
        </Button>
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
                  Pending Timesheets
                </p>
                <p className="text-3xl font-bold mt-2">{pendingTimesheets.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
                  This Period
                </p>
                <p className="text-3xl font-bold mt-2">
                  ${payrollRuns[0]?.total_gross_pay?.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
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
                  Employees
                </p>
                <p className="text-3xl font-bold mt-2">{payrollRuns[0]?.employee_count || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
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
                  Next Pay Date
                </p>
                <p className="text-xl font-bold mt-2">
                  {payrollRuns[0]?.pay_date 
                    ? new Date(payrollRuns[0].pay_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                    : 'TBD'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for pending timesheets */}
      {pendingTimesheets.length > 0 && (
        <Alert className={cn(
          "border-teal-600",
          isDark ? "bg-teal-950/20" : "bg-teal-50"
        )}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {pendingTimesheets.length} approved timesheets ready for payroll processing
          </AlertDescription>
        </Alert>
      )}

      {/* Payroll Runs */}
      <Card className={cn(
        "transition-colors duration-300",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
      )}>
        <CardHeader>
          <CardTitle>Recent Payroll Runs</CardTitle>
          <CardDescription>Last 20 payroll processing cycles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payrollRuns.map((run) => (
              <div key={run.id} className={cn(
                "p-4 rounded-lg border transition-colors duration-300",
                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {run.run_name}
                    </h4>
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Pay Date: {new Date(run.pay_date).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <Badge className={getStatusColor(run.status)}>
                    {run.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-3">
                  <div>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Employees
                    </p>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {run.employee_count}
                    </p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Gross Pay
                    </p>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      ${run.total_gross_pay?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Tax
                    </p>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      ${run.total_tax_withheld?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Net Pay
                    </p>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      ${run.total_net_pay?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {run.status === 'approved' && !run.xero_synced && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncToXeroMutation.mutate(run.id)}
                      disabled={syncToXeroMutation.isPending}
                      className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync to Xero
                    </Button>
                  )}
                  {run.xero_synced && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Synced to Xero
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            ))}

            {payrollRuns.length === 0 && (
              <div className="text-center py-8">
                <p className={cn(
                  "text-sm",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  No payroll runs yet. Process your first payroll to get started.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}