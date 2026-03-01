import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { Brain, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Shield, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ExecutiveBrief() {
  const [brief, setBrief] = useState(null);
  const [generating, setGenerating] = useState(false);
  const today = format(new Date(), 'EEEE, d MMMM yyyy');

  const { data: clients = [] } = useQuery({ queryKey: ['clients-brief'], queryFn: () => base44.entities.Client.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks-brief'], queryFn: () => base44.entities.Task.list() });
  const { data: compliance = [] } = useQuery({ queryKey: ['compliance-brief'], queryFn: () => base44.entities.ComplianceItem.list() });
  const { data: intakes = [] } = useQuery({ queryKey: ['intakes-brief'], queryFn: () => base44.entities.ClientIntakeRequest.list() });
  const { data: restrictive = [] } = useQuery({ queryKey: ['rp-brief'], queryFn: () => base44.entities.RestrictivePractice.list() });
  const { data: screenings = [] } = useQuery({ queryKey: ['screening-brief'], queryFn: () => base44.entities.WorkerScreening.list() });

  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.due_date && isBefore(new Date(t.due_date), new Date()));
  const criticalCompliance = compliance.filter(c => c.status !== 'compliant' && c.priority === 'critical');
  const newIntakes = intakes.filter(i => i.status === 'new');
  const expiringScreenings = screenings.filter(s => s.expiry_date && differenceInDays(new Date(s.expiry_date), new Date()) <= 30 && differenceInDays(new Date(s.expiry_date), new Date()) >= 0);
  const expiringRPs = restrictive.filter(r => r.expiry_date && differenceInDays(new Date(r.expiry_date), new Date()) <= 30 && differenceInDays(new Date(r.expiry_date), new Date()) >= 0);
  const planReviewClients = clients.filter(c => c.plan_end_date && differenceInDays(new Date(c.plan_end_date), new Date()) <= 60 && differenceInDays(new Date(c.plan_end_date), new Date()) >= 0);

  const generateBrief = async () => {
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the AI co-pilot for Breakthrough Manager OS, an NDIS provider management system.
Generate a concise executive morning brief for the Practice Manager. Write in plain, structured text — no headings with ##, just clear sections.
Today: ${today}

Current operational data:
- Active Clients: ${clients.filter(c => c.status === 'active').length}
- New Intake Requests (unreviewed): ${newIntakes.length}
- Overdue Tasks: ${overdueTasks.length} (categories: ${[...new Set(overdueTasks.map(t => t.category))].join(', ') || 'none'})
- Critical Compliance Issues: ${criticalCompliance.length} (${criticalCompliance.map(c => c.title).join(', ') || 'none'})
- Worker Screenings Expiring in 30 days: ${expiringScreenings.length}
- Restrictive Practices Expiring in 30 days: ${expiringRPs.length}
- NDIS Plans Requiring Review (next 60 days): ${planReviewClients.length}

Generate:
1. Priority Alert (1 sentence on the most urgent item)
2. Top 3 Actions for Today (specific, actionable)
3. Risk Radar (1-2 compliance or clinical risks to monitor)
4. Positive Signal (1 operational win or stable indicator)

Keep it under 200 words. Use the tone of a confident, compliance-aware operations advisor.`,
        response_json_schema: {
          type: "object",
          properties: {
            priority_alert: { type: "string" },
            top_actions: { type: "array", items: { type: "string" } },
            risk_radar: { type: "array", items: { type: "string" } },
            positive_signal: { type: "string" },
          }
        }
      });
      setBrief(result);
    } finally {
      setGenerating(false);
    }
  };

  const metrics = [
    { label: 'Active Clients', value: clients.filter(c => c.status === 'active').length, icon: Users, color: 'text-teal-600' },
    { label: 'New Intakes', value: newIntakes.length, icon: UserPlus, color: 'text-blue-600' },
    { label: 'Overdue Tasks', value: overdueTasks.length, icon: Clock, color: overdueTasks.length > 0 ? 'text-red-600' : 'text-emerald-600' },
    { label: 'Critical Compliance', value: criticalCompliance.length, icon: Shield, color: criticalCompliance.length > 0 ? 'text-red-600' : 'text-emerald-600' },
    { label: 'Expiring Screenings', value: expiringScreenings.length, icon: AlertTriangle, color: expiringScreenings.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { label: 'Plan Reviews Due', value: planReviewClients.length, icon: TrendingUp, color: planReviewClients.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-teal-600" />
            Executive Morning Brief
          </h2>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <Button onClick={generateBrief} disabled={generating} className="bg-teal-600 hover:bg-teal-700">
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {generating ? 'Generating...' : 'Generate Brief'}
        </Button>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <m.icon className={cn("w-5 h-5 mx-auto mb-1", m.color)} />
              <p className={cn("text-2xl font-bold", m.color)}>{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Brief */}
      {brief && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Priority Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-900">{brief.priority_alert}</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Positive Signal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-900">{brief.positive_signal}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Top Actions for Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {brief.top_actions?.map((action, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="font-bold text-teal-600 flex-shrink-0">{i + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Risk Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {brief.risk_radar?.map((risk, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-900">
                    <span className="flex-shrink-0">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {!brief && !generating && (
        <Card className="py-12">
          <div className="text-center text-muted-foreground">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Click "Generate Brief" to produce today's AI-powered operational summary</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// Needed for the metrics
function UserPlus(props) {
  return <Users {...props} />;
}