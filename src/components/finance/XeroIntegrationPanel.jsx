import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { Link2, CheckCircle2, AlertTriangle, Loader2, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function XeroIntegrationPanel() {
  const { isDark } = useTheme();
  const [status, setStatus] = useState(null); // null | 'connected' | 'not_configured' | 'error'
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('xeroSync', { action: 'status' });
    if (res.data?.connected) {
      setStatus('connected');
      setOrgName(res.data.organisation || '');
    } else if (res.data?.setup_required) {
      setStatus('not_configured');
    } else {
      setStatus('error');
      setError(res.data?.error || 'Unknown error');
    }
    setLoading(false);
  };

  const fetchInvoices = async () => {
    setActionLoading('invoices');
    const res = await base44.functions.invoke('xeroSync', { action: 'get_invoices', status: 'AUTHORISED' });
    setInvoices(res.data?.invoices || []);
    setActionLoading(null);
  };

  useEffect(() => { checkStatus(); }, []);

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-4",
      isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-teal-500" />
          <h3 className="font-semibold text-sm">Xero Integration</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={checkStatus}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Status */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking connection...
        </div>
      ) : status === 'connected' ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-700">Connected</p>
            {orgName && <p className="text-xs text-emerald-600">{orgName}</p>}
          </div>
        </div>
      ) : status === 'not_configured' ? (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-700">Credentials Required</p>
          </div>
          <p className="text-xs text-amber-600">
            Set <code className="bg-amber-100 px-1 rounded">XERO_CLIENT_ID</code>, <code className="bg-amber-100 px-1 rounded">XERO_CLIENT_SECRET</code>, <code className="bg-amber-100 px-1 rounded">XERO_REFRESH_TOKEN</code>, and <code className="bg-amber-100 px-1 rounded">XERO_TENANT_ID</code> in your app secrets.
          </p>
          <a
            href="https://developer.xero.com/myapps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-700 underline"
          >
            Xero Developer Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : status === 'error' ? (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm font-medium text-red-700">Connection Error</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      ) : null}

      {/* Actions — only when connected */}
      {status === 'connected' && (
        <div className="space-y-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={fetchInvoices}
            disabled={actionLoading === 'invoices'}
          >
            {actionLoading === 'invoices'
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
              : <><FileText className="w-3.5 h-3.5" /> Fetch Authorised Invoices</>}
          </Button>

          {invoices.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{invoices.length} Invoices</p>
              {invoices.map((inv, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between p-2 rounded-lg border text-xs",
                  isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
                )}>
                  <div>
                    <p className="font-medium">{inv.Contact?.Name || 'Unknown'}</p>
                    <p className="text-slate-500">{inv.InvoiceNumber} · {inv.Date?.split('T')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${inv.Total?.toFixed(2)}</p>
                    <Badge className={cn("text-xs", inv.Status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                      {inv.Status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
        Xero integration supports invoices, accounts, and bank transaction sync. Full OAuth setup required via Xero Developer Portal.
      </p>
    </div>
  );
}