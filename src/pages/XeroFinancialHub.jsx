import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import XeroProfitLossReport from '@/components/finance/XeroProfitLossReport';
import XeroBankReconciliation from '@/components/finance/XeroBankReconciliation';
import XeroPayrollReport from '@/components/finance/XeroPayrollReport';
import XeroIntegrationPanel from '@/components/finance/XeroIntegrationPanel';

export default function XeroFinancialHub() {
  const { isDark } = useTheme();
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'checking' | 'connected' | 'not_configured' | 'error'
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      const res = await base44.functions.invoke('xeroSync', { action: 'status' });
      if (res.data?.connected) {
        setConnectionStatus('connected');
        setOrgName(res.data.organisation || '');
      } else if (res.data?.setup_required) {
        setConnectionStatus('not_configured');
      } else {
        setConnectionStatus('error');
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xero Financial Hub</h1>
          <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            Bank reconciliation · Profit & Loss · Payroll
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus === 'checking' && (
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
            </Badge>
          )}
          {connectionStatus === 'connected' && (
            <Badge className="bg-emerald-100 text-emerald-700 gap-1.5 text-xs border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> {orgName || 'Connected'}
            </Badge>
          )}
          {connectionStatus === 'not_configured' && (
            <Badge className="bg-amber-100 text-amber-700 gap-1.5 text-xs border-amber-200">
              <AlertTriangle className="w-3 h-3" /> Credentials Required
            </Badge>
          )}
          {connectionStatus === 'error' && (
            <Badge className="bg-red-100 text-red-700 gap-1.5 text-xs border-red-200">
              <AlertTriangle className="w-3 h-3" /> Connection Error
            </Badge>
          )}
          <a
            href="https://go.xero.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
              isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-600"
            )}
          >
            Open Xero <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Not configured banner */}
      {connectionStatus === 'not_configured' && (
        <div className="max-w-lg">
          <XeroIntegrationPanel />
        </div>
      )}

      {/* Main content */}
      {(connectionStatus === 'connected' || connectionStatus === 'error') && (
        <Tabs defaultValue="reconciliation">
          <TabsList className={cn(isDark ? "bg-slate-800" : "bg-slate-100")}>
            <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="settings">Connection</TabsTrigger>
          </TabsList>

          <TabsContent value="reconciliation" className="mt-4">
            <XeroBankReconciliation />
          </TabsContent>

          <TabsContent value="pl" className="mt-4">
            <XeroProfitLossReport />
          </TabsContent>

          <TabsContent value="payroll" className="mt-4">
            <XeroPayrollReport />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 max-w-lg">
            <XeroIntegrationPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}