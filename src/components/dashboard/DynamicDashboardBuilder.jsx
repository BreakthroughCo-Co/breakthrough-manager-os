import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DynamicDashboardBuilder({ onApply }) {
  const [config, setConfig] = useState({ role: 'manager', focus_areas: [], time_period: 'last_30_days' });
  const [dashboard, setDashboard] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateRoleBasedDashboard', config);
      return response.data;
    },
    onSuccess: (data) => {
      setDashboard(data.dashboard);
    }
  });

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            AI Dashboard Generator
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Dashboard'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Role Focus</label>
              <Select value={config.role} onValueChange={(v) => setConfig({ ...config, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Practice Manager</SelectItem>
                  <SelectItem value="business">Business Manager</SelectItem>
                  <SelectItem value="clinical">Clinical Lead</SelectItem>
                  <SelectItem value="compliance">Compliance Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Time Period</label>
              <Select value={config.time_period} onValueChange={(v) => setConfig({ ...config, time_period: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dashboard && (
            <Tabs defaultValue="widgets">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="widgets">Widgets</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="widgets" className="space-y-2">
                {dashboard.recommended_widgets?.slice(0, 6).map((widget, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium">{widget.title}</span>
                      <Badge className={
                        widget.priority === 'high' ? 'bg-red-600' :
                        widget.priority === 'medium' ? 'bg-amber-600' :
                        'bg-blue-600'
                      }>
                        {widget.priority}
                      </Badge>
                    </div>
                    <p className="text-slate-600">{widget.visualization_type} - {widget.size}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="alerts" className="space-y-2">
                {dashboard.priority_alerts?.map((alert, idx) => (
                  <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium">{alert.metric}</span>
                      <Badge className="bg-red-600">{alert.severity}</Badge>
                    </div>
                    <p className="text-slate-700">Current: {alert.current_value} | Target: {alert.threshold}</p>
                    <p className="text-blue-700 mt-1"><strong>Action:</strong> {alert.recommendation}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="insights" className="space-y-2">
                {dashboard.actionable_insights?.map((insight, idx) => (
                  <div key={idx} className="p-2 bg-white rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium">{insight.insight}</span>
                      <Badge variant="outline">{insight.impact_level}</Badge>
                    </div>
                    <p className="text-slate-600">{insight.supporting_data}</p>
                    <p className="text-green-700 mt-1"><strong>Action:</strong> {insight.recommended_action}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}