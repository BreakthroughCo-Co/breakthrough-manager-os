import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { Shield, Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  compliant:        { label: 'Compliant',        icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  attention_needed: { label: 'Attention Needed', icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  non_compliant:    { label: 'Non-Compliant',    icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
};

const SEVERITY_COLORS = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800 font-bold',
};

export default function AIComplianceReviewer({ entityType = 'Incident', entityId = null, prefillContent = '' }) {
  const { isDark } = useTheme();
  const [content, setContent] = useState(prefillContent);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showIssues, setShowIssues] = useState(true);

  const handleReview = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    const response = await base44.functions.invoke('aiComplianceReview', {
      entity_type: entityType,
      entity_id: entityId,
      content: content.trim(),
      context: context.trim() || undefined,
    });
    setResult(response.data);
    setLoading(false);
  };

  const statusCfg = result ? STATUS_CONFIG[result.compliance_status] || STATUS_CONFIG.attention_needed : null;

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-4",
      isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
    )}>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-teal-500" />
        <h3 className="font-semibold text-sm">AI Compliance Reviewer</h3>
        <Badge className="bg-teal-100 text-teal-700 text-xs ml-auto">NDIS Standards</Badge>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Paste incident report, case note, BSP excerpt, or other content to review for NDIS compliance..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={5}
          className="text-sm resize-none"
        />
        <Textarea
          placeholder="Additional context (optional — e.g. client background, plan details, prior incidents)"
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <Button
        onClick={handleReview}
        disabled={loading || !content.trim()}
        className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
        size="sm"
      >
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reviewing against NDIS Standards...</> : 'Run Compliance Review'}
      </Button>

      {result && statusCfg && (
        <div className="space-y-3 pt-1">
          {/* Status Banner */}
          <div className={cn("flex items-center gap-3 p-3 rounded-lg border", statusCfg.bg)}>
            <statusCfg.icon className={cn("w-5 h-5 flex-shrink-0", statusCfg.color)} />
            <div className="flex-1 min-w-0">
              <p className={cn("font-semibold text-sm", statusCfg.color)}>{statusCfg.label}</p>
              {result.audit_readiness_score !== undefined && (
                <p className="text-xs text-slate-500 mt-0.5">Audit Readiness: {result.audit_readiness_score}/100</p>
              )}
            </div>
            <Badge className={cn("text-xs", SEVERITY_COLORS[result.risk_level] || 'bg-slate-100')}>
              {result.risk_level} risk
            </Badge>
          </div>

          {/* Summary */}
          {result.summary && (
            <p className={cn("text-sm leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
              {result.summary}
            </p>
          )}

          {/* Issues */}
          {result.issues?.length > 0 && (
            <div>
              <button
                onClick={() => setShowIssues(v => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 hover:text-slate-600"
              >
                Issues Found ({result.issues.length})
                {showIssues ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showIssues && (
                <ul className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <li key={i} className={cn(
                      "p-2.5 rounded-lg border text-sm",
                      isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("font-medium text-xs", isDark ? "text-slate-200" : "text-slate-800")}>{issue.standard}</span>
                        <Badge className={cn("text-xs flex-shrink-0", SEVERITY_COLORS[issue.severity] || 'bg-slate-100')}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <p className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-600")}>{issue.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Corrective Actions */}
          {result.corrective_actions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Required Actions</p>
              <ul className="space-y-1">
                {result.corrective_actions.map((action, i) => (
                  <li key={i} className={cn("text-sm flex items-start gap-2", isDark ? "text-slate-300" : "text-slate-700")}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Relevant Standards */}
          {result.relevant_standards?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Relevant NDIS Standards</p>
              <div className="flex flex-wrap gap-1">
                {result.relevant_standards.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}