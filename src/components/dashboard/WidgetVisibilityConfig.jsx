import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';

export const DASHBOARD_WIDGETS = [
  { id: 'ai_overview', label: 'AI Client Intelligence Overview' },
  { id: 'dynamic_builder', label: 'Dynamic Dashboard Builder' },
  { id: 'plan_expiry', label: 'Plan Expiry Alerts' },
  { id: 'client_risk', label: 'Client Risk Alerts' },
  { id: 'compliance_risk', label: 'Compliance Risk Monitor' },
  { id: 'operational_alerts', label: 'Operational Alerts' },
  { id: 'operational_metrics', label: 'Operational Metrics' },
  { id: 'practitioner_metrics', label: 'Practitioner Metrics' },
  { id: 'incident_chart', label: 'Incident Chart' },
  { id: 'compliance_chart', label: 'Compliance Chart' },
  { id: 'team_analytics', label: 'Team Analytics' },
  { id: 'resource_allocation', label: 'Resource Allocation' },
  { id: 'proactive_compliance', label: 'Proactive Compliance Monitor' },
  { id: 'funding_overview', label: 'Funding Overview' },
  { id: 'funding_burn_rate', label: 'Funding Burn Rate' },
  { id: 'worker_screening', label: 'Worker Screening Expiry' },
  { id: 'restrictive_practice', label: 'Restrictive Practice Expiry' },
  { id: 'funding_analytics', label: 'Funding Analytics' },
  { id: 'resource_optimization', label: 'Resource Optimisation' },
  { id: 'engagement_monitor', label: 'Engagement Monitor' },
  { id: 'systemic_trends', label: 'Systemic Trends' },
  { id: 'alerts_panel', label: 'Alerts Panel' },
  { id: 'recent_activity', label: 'Recent Activity' },
];

const STORAGE_KEY = 'dashboard_widget_visibility';

export function useWidgetVisibility() {
  const [visibility, setVisibility] = React.useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return Object.fromEntries(DASHBOARD_WIDGETS.map(w => [w.id, true]));
  });

  // On mount, load from user profile (server-persisted)
  React.useEffect(() => {
    const loadFromProfile = async () => {
      try {
        const { base44 } = await import('@/api/base44Client');
        const user = await base44.auth.me();
        if (user?.dashboard_config) {
          const serverConfig = JSON.parse(user.dashboard_config);
          setVisibility(serverConfig);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverConfig));
        }
      } catch {}
    };
    loadFromProfile();
  }, []);

  const toggle = (id) => {
    setVisibility(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Persist to user profile
      import('@/api/base44Client').then(({ base44 }) => {
        base44.auth.updateMe({ dashboard_config: JSON.stringify(next) }).catch(() => {});
      });
      return next;
    });
  };

  const isVisible = (id) => visibility[id] !== false;

  return { isVisible, toggle, visibility };
}

export default function WidgetVisibilityConfig({ visibility, onToggle }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          Dashboard Widget Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DASHBOARD_WIDGETS.map(widget => (
            <div key={widget.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
              <Label className="text-xs text-slate-700 cursor-pointer" htmlFor={`widget-${widget.id}`}>
                {widget.label}
              </Label>
              <Switch
                id={`widget-${widget.id}`}
                checked={visibility[widget.id] !== false}
                onCheckedChange={() => onToggle(widget.id)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}