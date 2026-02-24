import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Bell
} from 'lucide-react';

/**
 * Privacy Breach Management
 * 
 * Notifiable Data Breaches (NDB) response workflow.
 * Optimized for OAIC compliance and rapid response.
 */

export default function PrivacyBreachManagement() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [formData, setFormData] = useState({
    breach_type: 'data_breach',
    severity: 'medium',
    description: '',
    discovery_date: new Date().toISOString().split('T')[0],
    affected_individuals_count: 0,
    affected_data_types: []
  });

  const { data: breaches = [] } = useQuery({
    queryKey: ['privacyBreaches'],
    queryFn: () => base44.entities.PrivacyBreach.list('-created_date', 50)
  });

  const reportBreachMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke('handlePrivacyBreach', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacyBreaches'] });
      setShowReportDialog(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      breach_type: 'data_breach',
      severity: 'medium',
      description: '',
      discovery_date: new Date().toISOString().split('T')[0],
      affected_individuals_count: 0,
      affected_data_types: []
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      identified: 'bg-slate-100 text-slate-700',
      assessment_in_progress: 'bg-blue-100 text-blue-700',
      contained: 'bg-yellow-100 text-yellow-700',
      notifiable: 'bg-orange-100 text-orange-700',
      oaic_notified: 'bg-teal-100 text-teal-700',
      individuals_notified: 'bg-green-100 text-green-700',
      resolved: 'bg-emerald-100 text-emerald-700'
    };
    return colors[status] || colors.identified;
  };

  const activeBreaches = breaches.filter(b => b.status !== 'resolved');
  const criticalBreaches = breaches.filter(b => b.severity === 'critical' && b.status !== 'resolved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            "text-2xl font-bold transition-colors duration-300",
            isDark ? "text-slate-50" : "text-slate-900"
          )}>
            Privacy Breach Management
          </h2>
          <p className={cn(
            "mt-1 transition-colors duration-300",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>
            Notifiable Data Breaches (NDB) response and OAIC compliance
          </p>
        </div>
        <Button
          onClick={() => setShowReportDialog(true)}
          className="bg-red-600 hover:bg-red-700 touch-manipulation select-none min-h-[44px]"
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Report Breach
        </Button>
      </div>

      {/* Critical Alert Banner */}
      {criticalBreaches.length > 0 && (
        <Alert className="border-red-600 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Privacy Breaches Require Immediate Action</AlertTitle>
          <AlertDescription>
            {criticalBreaches.length} critical breach{criticalBreaches.length > 1 ? 'es' : ''} pending resolution
          </AlertDescription>
        </Alert>
      )}

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
                  Active Breaches
                </p>
                <p className="text-3xl font-bold mt-2">{activeBreaches.length}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-red-600" />
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
                  Critical
                </p>
                <p className="text-3xl font-bold mt-2 text-red-600">{criticalBreaches.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
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
                  OAIC Notified
                </p>
                <p className="text-3xl font-bold mt-2">
                  {breaches.filter(b => b.oaic_notification_date).length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-teal-600" />
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
                  Resolved
                </p>
                <p className="text-3xl font-bold mt-2">
                  {breaches.filter(b => b.status === 'resolved').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breach List */}
      <Card className={cn(
        "transition-colors duration-300",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
      )}>
        <CardHeader>
          <CardTitle>Privacy Breaches</CardTitle>
          <CardDescription>All reported privacy incidents and data breaches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breaches.map((breach) => (
              <div key={breach.id} className={cn(
                "p-4 rounded-lg border transition-colors duration-300",
                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getSeverityColor(breach.severity)}>
                        {breach.severity}
                      </Badge>
                      <Badge className={getStatusColor(breach.status)}>
                        {breach.status.replace(/_/g, ' ')}
                      </Badge>
                      {breach.notifiable_under_ndb && (
                        <Badge className="bg-red-100 text-red-700">
                          NDB Notifiable
                        </Badge>
                      )}
                    </div>
                    <h4 className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {breach.breach_id} - {breach.breach_type.replace(/_/g, ' ')}
                    </h4>
                    <p className={cn(
                      "text-sm mt-1",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      {breach.description.substring(0, 150)}...
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mt-3 pt-3 border-t">
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Discovered
                    </p>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                      {new Date(breach.discovery_date).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Affected
                    </p>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                      {breach.affected_individuals_count} individuals
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Investigated By
                    </p>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                      {breach.investigated_by || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      OAIC Reference
                    </p>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                      {breach.oaic_reference || 'Not notified'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {breaches.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className={cn(
                  "text-sm",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  No privacy breaches reported
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Breach Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className={cn(
          "touch-manipulation max-w-2xl",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              Report Privacy Breach
            </DialogTitle>
            <DialogDescription>
              Initiate NDB assessment and response workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Breach Type</Label>
                <Select
                  value={formData.breach_type}
                  onValueChange={(val) => setFormData({...formData, breach_type: val})}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_breach">Data Breach</SelectItem>
                    <SelectItem value="unauthorised_access">Unauthorised Access</SelectItem>
                    <SelectItem value="unauthorised_disclosure">Unauthorised Disclosure</SelectItem>
                    <SelectItem value="data_loss">Data Loss</SelectItem>
                    <SelectItem value="system_compromise">System Compromise</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(val) => setFormData({...formData, severity: val})}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Discovery Date</Label>
              <Input
                type="date"
                value={formData.discovery_date}
                onChange={(e) => setFormData({...formData, discovery_date: e.target.value})}
                className="min-h-[44px]"
              />
            </div>

            <div>
              <Label>Affected Individuals Count</Label>
              <Input
                type="number"
                value={formData.affected_individuals_count}
                onChange={(e) => setFormData({...formData, affected_individuals_count: parseInt(e.target.value)})}
                className="min-h-[44px]"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detailed description of the breach..."
                className="min-h-[120px]"
              />
            </div>

            <Alert className="border-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                OAIC requires notification within 30 days if the breach is likely to result in serious harm.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              className="touch-manipulation select-none min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => reportBreachMutation.mutate(formData)}
              disabled={!formData.description || reportBreachMutation.isPending}
              className="bg-red-600 hover:bg-red-700 touch-manipulation select-none min-h-[44px]"
            >
              {reportBreachMutation.isPending ? 'Processing...' : 'Report & Assess'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}