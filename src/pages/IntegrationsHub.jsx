import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  DollarSign,
  FileText,
  Users,
  Shield,
  Zap
} from 'lucide-react';

/**
 * Integrations Hub
 * 
 * Central management for all external system integrations.
 * Optimized for managerial oversight of integration status and health.
 */

export default function IntegrationsHub() {
  const { isDark } = useTheme();
  const [syncing, setSyncing] = useState({});

  const integrations = [
    {
      id: 'xero',
      name: 'Xero Accounting',
      description: 'Automated invoice sync and financial reporting',
      status: 'active',
      icon: DollarSign,
      configured: true,
      lastSync: '2 hours ago',
      records: 145,
      actions: ['Sync Invoices', 'View Logs', 'Configure']
    },
    {
      id: 'ndia',
      name: 'NDIA myplace',
      description: 'Service booking and payment claim submission',
      status: 'pending_setup',
      icon: FileText,
      configured: false,
      lastSync: 'Never',
      records: 0,
      actions: ['Connect', 'View Documentation']
    },
    {
      id: 'commission',
      name: 'NDIS Commission Portal',
      description: 'Reportable incident submission',
      status: 'active',
      icon: Shield,
      configured: true,
      lastSync: '1 day ago',
      records: 12,
      actions: ['Submit Incident', 'View Submissions', 'Configure']
    },
    {
      id: 'referrals',
      name: 'Referral Automation',
      description: 'Automated referral intake and screening',
      status: 'active',
      icon: Users,
      configured: true,
      lastSync: '10 minutes ago',
      records: 23,
      actions: ['View Pipeline', 'Configure Rules']
    }
  ];

  const handleSync = async (integrationId) => {
    setSyncing(prev => ({ ...prev, [integrationId]: true }));
    
    // Simulate sync
    setTimeout(() => {
      setSyncing(prev => ({ ...prev, [integrationId]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={cn(
          "text-2xl font-bold transition-colors duration-300",
          isDark ? "text-slate-50" : "text-slate-900"
        )}>
          Integration Hub
        </h2>
        <p className={cn(
          "mt-1 transition-colors duration-300",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>
          Manage external system connections and data synchronization
        </p>
      </div>

      {/* Status Overview */}
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
                  Active Integrations
                </p>
                <p className="text-3xl font-bold mt-2">3</p>
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
                  Records Synced
                </p>
                <p className="text-3xl font-bold mt-2">180</p>
              </div>
              <Zap className="h-8 w-8 text-teal-600" />
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
                  Pending Setup
                </p>
                <p className="text-3xl font-bold mt-2">1</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
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
                  Last Sync
                </p>
                <p className="text-xl font-bold mt-2">10 min ago</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      <Alert className={cn(
        "border-orange-600",
        isDark ? "bg-orange-950/20" : "bg-orange-50"
      )}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          NDIA myplace integration requires configuration. Complete setup to enable automated payment claims.
        </AlertDescription>
      </Alert>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isSyncing = syncing[integration.id];
          
          return (
            <Card key={integration.id} className={cn(
              "transition-colors duration-300",
              isDark ? "bg-slate-900 border-slate-800" : "bg-white"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isDark ? "bg-slate-800" : "bg-slate-100"
                    )}>
                      <Icon className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                    {integration.status === 'active' ? 'Active' : 'Setup Required'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Last Sync
                    </p>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {integration.lastSync}
                    </p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Records Synced
                    </p>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {integration.records}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {integration.configured && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(integration.id)}
                      disabled={isSyncing}
                      className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  )}
                  {integration.actions.slice(0, 2).map((action) => (
                    <Button
                      key={action}
                      size="sm"
                      variant="ghost"
                      className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                    >
                      {action}
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Logs */}
      <Card className={cn(
        "transition-colors duration-300",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
      )}>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>Last 10 synchronization events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { integration: 'Xero', action: 'Invoice sync', status: 'success', time: '10 min ago', records: 5 },
              { integration: 'Referrals', action: 'New referral processed', status: 'success', time: '25 min ago', records: 1 },
              { integration: 'NDIS Commission', action: 'Incident report submitted', status: 'success', time: '1 day ago', records: 1 }
            ].map((log, idx) => (
              <div key={idx} className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                isDark ? "bg-slate-800" : "bg-slate-50"
              )}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className={cn(
                      "font-medium text-sm",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {log.integration}: {log.action}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      {log.records} records • {log.time}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}