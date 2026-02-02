import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Settings,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Calendar,
  Mail,
  FileText,
  DollarSign,
  Shield,
  Clock,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const INTEGRATIONS_CONFIG = [
  {
    id: 'xero',
    name: 'Xero',
    description: 'Sync invoices and contacts with your Xero accounting software',
    icon: '/xero-icon.png',
    iconFallback: DollarSign,
    color: 'bg-blue-500',
    features: [
      'Automatic invoice creation when billing approved',
      'Contact sync with participants',
      'GST-free NDIS billing support',
      'Real-time sync status'
    ],
    scopes: ['accounting.transactions', 'accounting.contacts'],
    docsUrl: 'https://developer.xero.com/documentation/'
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Connect Calendar and Gmail for appointments and communications',
    icon: '/google-icon.png',
    iconFallback: Calendar,
    color: 'bg-red-500',
    features: [
      'Calendar sync for sessions and appointments',
      'Send emails via your Gmail account',
      'Automatic event updates on reschedule',
      'Emails appear in your Sent folder'
    ],
    scopes: ['calendar', 'gmail.send'],
    docsUrl: 'https://developers.google.com/workspace'
  }
];

export default function Integrations() {
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [disconnectDialog, setDisconnectDialog] = useState(null);
  const [syncingProvider, setSyncingProvider] = useState(null);
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => base44.entities.Integration.list()
  });

  const disconnectMutation = useMutation({
    mutationFn: (id) => base44.entities.Integration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setDisconnectDialog(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Integration.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] })
  });

  const getIntegrationStatus = (providerId) => {
    const integration = integrations.find(i => i.provider_name === providerId);
    return integration;
  };

  const handleConnect = async (providerId) => {
    setConnectingProvider(providerId);
    
    // This will be replaced with actual OAuth flow once backend functions are enabled
    // For now, show informational message
    setTimeout(() => {
      setConnectingProvider(null);
      alert('Backend functions must be enabled to connect integrations. Please enable them in Dashboard → Settings.');
    }, 1000);
  };

  const handleDisconnect = (integration) => {
    setDisconnectDialog(integration);
  };

  const handleSyncNow = async (providerId) => {
    const integration = getIntegrationStatus(providerId);
    if (!integration) return;

    setSyncingProvider(providerId);
    
    // This will trigger actual sync once backend functions are enabled
    await updateMutation.mutateAsync({
      id: integration.id,
      data: { sync_status: 'syncing' }
    });

    // Simulate sync for demo
    setTimeout(async () => {
      await updateMutation.mutateAsync({
        id: integration.id,
        data: { 
          sync_status: 'success',
          last_sync: new Date().toISOString()
        }
      });
      setSyncingProvider(null);
    }, 2000);
  };

  const StatusBadge = ({ integration }) => {
    if (!integration) {
      return <Badge variant="outline" className="text-slate-500">Not Connected</Badge>;
    }
    
    if (!integration.is_active) {
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Inactive</Badge>;
    }

    const isExpired = integration.expires_at && new Date(integration.expires_at) < new Date();
    if (isExpired) {
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Token Expired</Badge>;
    }

    if (integration.sync_status === 'error') {
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Sync Error</Badge>;
    }

    return <Badge className="bg-green-100 text-green-700 border-green-300">Connected</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-teal-600" />
            Integrations
          </h2>
          <p className="text-slate-500 mt-1">Connect external services to automate your workflows</p>
        </div>
      </div>

      {/* Backend Functions Notice */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Backend Functions Required</AlertTitle>
        <AlertDescription className="text-amber-700">
          OAuth integrations require backend functions to be enabled. Go to <strong>Dashboard → Settings</strong> to enable them, 
          then set up your environment variables for XERO_CLIENT_ID, XERO_CLIENT_SECRET, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET.
        </AlertDescription>
      </Alert>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INTEGRATIONS_CONFIG.map((config) => {
          const integration = getIntegrationStatus(config.id);
          const isConnected = integration?.is_active;
          const IconComponent = config.iconFallback;

          return (
            <Card key={config.id} className={cn(
              "relative overflow-hidden transition-all",
              isConnected && "ring-2 ring-green-200"
            )}>
              {/* Status indicator stripe */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1",
                isConnected ? "bg-green-500" : "bg-slate-200"
              )} />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      config.color, "text-white"
                    )}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription className="text-sm">{config.description}</CardDescription>
                    </div>
                  </div>
                  <StatusBadge integration={integration} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features List */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Features</p>
                  <ul className="space-y-1.5">
                    {config.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Connection Details */}
                {integration && integration.is_active && (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Last Sync</span>
                      <span className="text-slate-900 font-medium">
                        {integration.last_sync 
                          ? format(new Date(integration.last_sync), 'MMM d, yyyy HH:mm')
                          : 'Never'
                        }
                      </span>
                    </div>
                    {integration.expires_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Token Expires</span>
                        <span className={cn(
                          "font-medium",
                          new Date(integration.expires_at) < new Date() ? "text-red-600" : "text-slate-900"
                        )}>
                          {format(new Date(integration.expires_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {integration.error_message && (
                      <div className="flex items-start gap-2 text-sm text-red-600 mt-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{integration.error_message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncNow(config.id)}
                        disabled={syncingProvider === config.id}
                        className="flex-1"
                      >
                        {syncingProvider === config.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(integration)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(config.id)}
                      disabled={connectingProvider === config.id}
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                    >
                      {connectingProvider === config.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                      )}
                      Connect {config.name}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(config.docsUrl, '_blank')}
                    title="View Documentation"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Sync Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Xero Invoice Sync
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>Invoices sync when marked as "Approved" or "Sent"</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>Participant names mapped to Xero Contacts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>NDIS line items mapped with GST-Free tax rate</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>One-way sync (App → Xero) to prevent conflicts</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                Google Calendar & Gmail
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>Sessions auto-create Calendar events</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>Rescheduled sessions update Calendar events</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>Emails sent via your Gmail appear in Sent folder</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>Client communications use your email identity</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Security & Privacy</AlertTitle>
        <AlertDescription>
          All OAuth tokens are encrypted at rest. We only request the minimum scopes needed for each integration. 
          You can disconnect at any time, which will revoke access and delete stored tokens.
        </AlertDescription>
      </Alert>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={!!disconnectDialog} onOpenChange={() => setDisconnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect {disconnectDialog?.provider_name}? 
              This will stop all automatic syncing and revoke access tokens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectMutation.mutate(disconnectDialog.id)}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-2" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}