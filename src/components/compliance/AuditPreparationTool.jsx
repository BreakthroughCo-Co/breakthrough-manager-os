import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const NDIS_STANDARDS = [
  'Quality & Safeguards',
  'Worker Screening',
  'Clinical Governance',
  'Documentation',
  'NDIS Registration',
  'Restrictive Practices'
];

export default function AuditPreparationTool() {
  const [selectedStandards, setSelectedStandards] = useState(new Set());
  const [startDate, setStartDate] = useState(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditType, setAuditType] = useState('full');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const toggleStandard = (standard) => {
    const updated = new Set(selectedStandards);
    if (updated.has(standard)) {
      updated.delete(standard);
    } else {
      updated.add(standard);
    }
    setSelectedStandards(updated);
  };

  const handlePrepare = async () => {
    if (selectedStandards.size === 0) {
      alert('Please select at least one NDIS standard');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await base44.functions.invoke('prepareAuditDocumentation', {
        audit_type: auditType,
        ndis_standards: Array.from(selectedStandards),
        date_range_start: startDate,
        date_range_end: endDate
      });
      setResults(result.data);
    } catch (error) {
      alert('Failed to prepare audit documentation: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (results) {
    const prep = results.preparation_summary;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Audit Preparation Report</h2>
          <Button onClick={() => setResults(null)} variant="outline">
            New Audit
          </Button>
        </div>

        {/* Readiness Status */}
        <Card className={
          prep.audit_readiness === 'fully_ready' ? 'border-emerald-200 bg-emerald-50' :
          prep.audit_readiness === 'mostly_ready' ? 'border-blue-200 bg-blue-50' :
          prep.audit_readiness === 'needs_preparation' ? 'border-amber-200 bg-amber-50' :
          'border-red-200 bg-red-50'
        }>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {prep.audit_readiness === 'fully_ready' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5" />}
              Audit Readiness: {prep.audit_readiness.toUpperCase().replace('_', ' ')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{prep.readiness_summary}</p>
          </CardContent>
        </Card>

        {/* Documentation Available */}
        <Card>
          <CardHeader>
            <CardTitle>Documentation Collated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prep.documentation_available.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm font-medium">{doc.document_type}</span>
                  <span className="text-sm text-slate-600">{doc.count} documents</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Critical Gaps */}
        {prep.critical_gaps.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900">Critical Gaps Identified</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {prep.critical_gaps.map((gap, idx) => (
                <div key={idx} className="p-2 bg-red-50 rounded border border-red-200">
                  <p className="font-medium text-sm text-red-900">{gap.gap}</p>
                  <p className="text-xs text-red-800">Standard: {gap.standard}</p>
                  <p className="text-xs text-red-700 mt-1">Can be resolved in: {gap.resolution_time}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle>NDIS Standards Compliance Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prep.compliance_status.map((std, idx) => (
              <div key={idx} className="p-2 bg-slate-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{std.standard}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    std.status === 'compliant' ? 'bg-emerald-100 text-emerald-700' :
                    std.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {std.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{std.evidence_available}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Remediation Plan */}
        {prep.remediation_plan.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Remediation Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {prep.remediation_plan.map((action, idx) => (
                <div key={idx} className="p-2 border-l-2 border-blue-400 pl-3">
                  <p className="font-medium text-sm">{action.action}</p>
                  <p className="text-xs text-slate-600 mt-1">Timeline: {action.timeline}</p>
                  <p className="text-xs text-slate-600">Responsible: {action.responsible}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Risk Areas */}
        {prep.risk_areas.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Areas Likely to be Scrutinized:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {prep.risk_areas.map((risk, idx) => (
                  <li key={idx} className="text-sm">{risk}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Preparation Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Select NDIS standards and date range. The system will identify and collate all relevant documentation, identify gaps, and generate a comprehensive audit readiness report.
          </AlertDescription>
        </Alert>

        {/* Audit Type */}
        <div>
          <Label>Audit Type</Label>
          <select 
            value={auditType}
            onChange={(e) => setAuditType(e.target.value)}
            className="w-full mt-2 px-3 py-2 border rounded-md"
          >
            <option value="full">Full Compliance Audit</option>
            <option value="specific">Specific Standards Review</option>
            <option value="risk">Risk-Based Audit</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date Range Start</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Date Range End</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        {/* NDIS Standards */}
        <div>
          <Label className="mb-3 block">Select NDIS Standards to Review</Label>
          <div className="space-y-2">
            {NDIS_STANDARDS.map(standard => (
              <div key={standard} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedStandards.has(standard)}
                  onCheckedChange={() => toggleStandard(standard)}
                  id={standard}
                />
                <label htmlFor={standard} className="text-sm cursor-pointer">
                  {standard}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handlePrepare}
          disabled={isAnalyzing || selectedStandards.size === 0}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Preparing Audit Documentation...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Prepare Audit Documentation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}