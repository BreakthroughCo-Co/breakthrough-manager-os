import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ComplianceAuditCenter() {
  const [auditResults, setAuditResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunAudit = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('conductComplianceAudit', {});
      setAuditResults(result.data);
    } catch (error) {
      alert('Audit failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          Running compliance audit...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Audit Center</h1>
          <p className="text-muted-foreground mt-1">Simulated NDIS compliance audits with corrective action tracking</p>
        </div>
        <Button onClick={handleRunAudit} className="bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Audit
        </Button>
      </div>

      {auditResults && (
        <>
          {/* Overall Rating */}
          <Card className={`border-l-4 ${
            auditResults.audit_findings.overall_compliance_rating >= 80 ? 'border-l-emerald-500' :
            auditResults.audit_findings.overall_compliance_rating >= 60 ? 'border-l-amber-500' :
            'border-l-red-500'
          }`}>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-2">Overall Compliance Rating</p>
              <p className="text-4xl font-bold">{auditResults.audit_findings.overall_compliance_rating}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                {auditResults.audit_findings.overall_compliance_rating >= 80 ? '✅ Good standing' :
                 auditResults.audit_findings.overall_compliance_rating >= 60 ? '⚠️ Attention needed' :
                 '🔴 Critical issues identified'}
              </p>
            </CardContent>
          </Card>

          {/* Audit Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total Findings</p>
                <p className="text-3xl font-bold">{auditResults.audit_findings.findings?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Critical Findings</p>
                <p className="text-3xl font-bold text-red-600">
                  {auditResults.audit_findings.findings?.filter(f => f.priority === 'Critical').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">High Risk Areas</p>
                <p className="text-3xl font-bold text-amber-600">
                  {auditResults.audit_findings.high_risk_areas?.length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Findings by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Findings by Severity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['critical', 'major_non_conformance', 'minor_non_conformance', 'observation'].map(severity => {
                const count = auditResults.audit_findings.findings?.filter(f => 
                  f.finding_type.toLowerCase() === severity
                ).length || 0;
                if (count === 0) return null;

                return (
                  <div key={severity} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium text-sm">{severity.replace(/_/g, ' ').toUpperCase()}</p>
                    </div>
                    <Badge className={
                      severity === 'critical' ? 'bg-red-600' :
                      severity === 'major_non_conformance' ? 'bg-orange-600' :
                      severity === 'minor_non_conformance' ? 'bg-amber-600' :
                      'bg-blue-600'
                    }>
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Critical Findings */}
          {auditResults.audit_findings.findings?.filter(f => f.priority === 'Critical').length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Findings Requiring Immediate Action
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {auditResults.audit_findings.findings?.filter(f => f.priority === 'Critical').slice(0, 5).map((finding, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <h4 className="font-semibold text-red-900 text-sm mb-1">{finding.description}</h4>
                    <p className="text-xs text-red-800 mb-2">NDIS Standard: {finding.ndis_standard}</p>
                    <p className="text-xs text-red-700 font-medium">Root Cause: {finding.root_cause}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* High Risk Areas */}
          {auditResults.audit_findings.high_risk_areas?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>High Risk Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {auditResults.audit_findings.high_risk_areas.map((area, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-red-600 mt-1">⚠️</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Systemic Issues */}
          {auditResults.audit_findings.systemic_issues?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Systemic Issues Identified</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {auditResults.audit_findings.systemic_issues.map((issue, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-amber-600 mt-1">→</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {auditResults.audit_findings.recommendations?.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900">Recommendations for Improvement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {auditResults.audit_findings.recommendations.slice(0, 6).map((rec, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-emerald-200">
                    <h4 className="font-semibold text-emerald-900 text-sm">{rec.recommendation}</h4>
                    <p className="text-xs text-emerald-800 mt-1">Area: {rec.area}</p>
                    <p className="text-xs text-emerald-700">Timeline: {rec.timeline}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Previous Audit Follow-up */}
          {auditResults.audit_findings.previous_audit_follow_up && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Audit Follow-up Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Prior findings: {auditResults.audit_findings.previous_audit_follow_up.prior_findings_count}</div>
                <div className="text-emerald-700">✓ Remediated: {auditResults.audit_findings.previous_audit_follow_up.remediated_count}</div>
                <div className="text-red-700">Outstanding: {auditResults.audit_findings.previous_audit_follow_up.outstanding_count}</div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}