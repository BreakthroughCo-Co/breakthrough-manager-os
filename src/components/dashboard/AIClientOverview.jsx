import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, TrendingUp, AlertTriangle, Calendar, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function AIClientOverview({ clients = [] }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clients.length > 0) {
      generateInsights();
    }
  }, [clients.length]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const highRiskClients = clients.filter(c => c.risk_level === 'high').length;
      const planExpiringClients = clients.filter(c => {
        if (!c.plan_end_date) return false;
        const daysUntil = Math.ceil((new Date(c.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil > 0;
      });
      const activeClients = clients.filter(c => c.status === 'active').length;
      
      const contextData = `
CASELOAD SUMMARY:
- Total Active Clients: ${activeClients}
- High-Risk Clients: ${highRiskClients}
- Plans Expiring (30 days): ${planExpiringClients.length}
- Waitlist: ${clients.filter(c => c.status === 'waitlist').length}

HIGH-RISK CLIENTS:
${clients.filter(c => c.risk_level === 'high').slice(0, 5).map(c => `- ${c.full_name}: ${c.service_type}`).join('\n')}

EXPIRING PLANS:
${planExpiringClients.slice(0, 5).map(c => `- ${c.full_name}: Expires ${c.plan_end_date}`).join('\n')}
`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `${contextData}

As a Practice Manager for an NDIS provider, analyze this caseload data and provide:
1. **Executive Summary** (2-3 sentences about overall caseload health)
2. **Priority Actions** (3-4 most critical actions needed this week)
3. **Risk Trends** (brief analysis of risk patterns)
4. **Capacity Insights** (recommendations on capacity and resource allocation)

Be concise, actionable, and focused on operational priorities.`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            priority_actions: { type: "array", items: { type: "string" } },
            risk_trends: { type: "string" },
            capacity_insights: { type: "string" }
          }
        }
      });

      setInsights(analysis);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span className="ml-2 text-sm text-purple-900">Generating AI insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-purple-900">AI-Driven Caseload Intelligence</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={generateInsights}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div className="p-3 bg-white/80 backdrop-blur rounded-lg">
          <p className="text-sm text-purple-900">{insights.executive_summary}</p>
        </div>

        {/* Priority Actions */}
        <div>
          <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Priority Actions This Week
          </h4>
          <div className="space-y-2">
            {insights.priority_actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-white/60 rounded text-sm">
                <span className="text-purple-600 font-bold">{idx + 1}.</span>
                <span className="text-purple-900">{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Trends */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/60 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-semibold text-orange-900">Risk Trends</h4>
            </div>
            <p className="text-xs text-orange-800">{insights.risk_trends}</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-semibold text-blue-900">Capacity</h4>
            </div>
            <p className="text-xs text-blue-800">{insights.capacity_insights}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2 pt-2 border-t border-purple-200">
          <Link to={createPageUrl('Clients')}>
            <Button size="sm" variant="ghost" className="text-purple-700 hover:text-purple-900">
              <ExternalLink className="w-3 h-3 mr-1" />
              View All Clients
            </Button>
          </Link>
          <Link to={createPageUrl('RiskMonitoring')}>
            <Button size="sm" variant="ghost" className="text-purple-700 hover:text-purple-900">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Risk Dashboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}