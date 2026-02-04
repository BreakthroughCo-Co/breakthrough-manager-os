import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ComplianceRiskMonitor({ onRefresh }) {
  const { data: complianceReport, isLoading, refetch } = useQuery({
    queryKey: ['complianceAnalysis'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeNDISCompliance', {});
      return response.data;
    },
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const handleRefresh = () => {
    refetch();
    if (onRefresh) onRefresh();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            NDIS Compliance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Analyzing compliance status...</p>
        </CardContent>
      </Card>
    );
  }

  const summary = complianceReport?.summary;
  const issues = complianceReport?.issues || [];

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (score >= 70) return <Shield className="h-5 w-5 text-amber-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            NDIS Compliance Monitor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Score */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {getScoreIcon(summary?.compliance_score)}
            <span className={`text-4xl font-bold ${getScoreColor(summary?.compliance_score)}`}>
              {summary?.compliance_score}/100
            </span>
          </div>
          <p className="text-sm text-slate-600">Overall Compliance Score</p>
          <Progress 
            value={summary?.compliance_score} 
            className="mt-2 h-2"
          />
        </div>

        {/* Issue Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-2xl font-bold text-red-700">{summary?.critical_issues}</p>
            <p className="text-xs text-red-600">Critical</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-2xl font-bold text-orange-700">{summary?.high_priority_issues}</p>
            <p className="text-xs text-orange-600">High</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-2xl font-bold text-amber-700">{summary?.medium_priority_issues}</p>
            <p className="text-xs text-amber-600">Medium</p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Issues by Category</h4>
          <div className="space-y-2">
            {Object.entries(summary?.categories || {}).map(([category, count]) => (
              count > 0 && (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 capitalize">{category.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Top Critical Issues */}
        {summary?.critical_issues > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Critical Issues Requiring Immediate Action
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {issues.filter(i => i.severity === 'critical').slice(0, 5).map((issue, idx) => (
                <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <p className="font-medium text-red-900">{issue.entity_name}</p>
                  <p className="text-red-700">{issue.issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Analysis */}
        <p className="text-xs text-slate-500 text-center">
          Last analyzed: {new Date(summary?.analysis_date).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}