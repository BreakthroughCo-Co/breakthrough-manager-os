import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Target, Plus, TrendingUp, TrendingDown, Minus, BarChart3, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const trendConfig = {
  improving: { label: 'Improving', color: 'bg-emerald-100 text-emerald-700', icon: TrendingUp },
  stable: { label: 'Stable', color: 'bg-blue-100 text-blue-700', icon: Minus },
  declining: { label: 'Declining', color: 'bg-red-100 text-red-700', icon: TrendingDown },
  achieved: { label: 'Achieved', color: 'bg-purple-100 text-purple-700', icon: Target },
  insufficient_data: { label: 'Insufficient Data', color: 'bg-slate-100 text-slate-600', icon: BarChart3 },
};

const emptyMetric = {
  client_id: '', client_name: '', goal_description: '', ndis_domain: 'daily_activities',
  metric_name: '', metric_unit: '', baseline_value: '', target_value: '',
  current_value: '', measurement_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
};

export default function ClientOutcomesTracking() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyMetric);
  const [isLogging, setIsLogging] = useState(false);
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState(null);

  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: metrics = [] } = useQuery({ queryKey: ['goalMetrics'], queryFn: () => base44.entities.ClientGoalMetric.list('-measurement_date') });

  const handleClientChange = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: c?.full_name || '' });
  };

  const handleLogMetric = async () => {
    setIsLogging(true);
    const result = await base44.functions.invoke('logClientGoalMetric', {
      client_id: formData.client_id,
      metric_name: formData.metric_name,
      metric_unit: formData.metric_unit,
      current_value: parseFloat(formData.current_value),
      baseline_value: formData.baseline_value !== '' ? parseFloat(formData.baseline_value) : undefined,
      target_value: formData.target_value !== '' ? parseFloat(formData.target_value) : undefined,
      measurement_date: formData.measurement_date,
      ndis_domain: formData.ndis_domain,
      goal_description: formData.goal_description,
      notes: formData.notes
    });
    queryClient.invalidateQueries({ queryKey: ['goalMetrics'] });
    setIsDialogOpen(false);
    setFormData(emptyMetric);
    setIsLogging(false);
  };

  const filteredMetrics = selectedClient === 'all' ? metrics : metrics.filter(m => m.client_id === selectedClient);

  // Group by metric_name per client for chart view
  const clientMetricGroups = {};
  filteredMetrics.forEach(m => {
    const key = `${m.client_id}||${m.metric_name}`;
    if (!clientMetricGroups[key]) clientMetricGroups[key] = { client: m.client_name, metric: m.metric_name, unit: m.metric_unit, data: [], latestTrend: m.trend, latestInsight: m.ai_insight };
    clientMetricGroups[key].data.push({ date: m.measurement_date, value: m.current_value, target: m.target_value });
  });
  const groups = Object.values(clientMetricGroups).sort((a, b) => a.client.localeCompare(b.client));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-teal-600" />
            Client Outcomes Tracking
          </h2>
          <p className="text-slate-500 mt-1">NDIS goal metrics, progress logging & AI trend analysis</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />Log Progress
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(trendConfig).filter(([k]) => k !== 'insufficient_data').map(([key, cfg]) => {
          const count = filteredMetrics.filter(m => m.trend === key).length;
          const Icon = cfg.icon;
          return (
            <Card key={key} className="border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-slate-500">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metric Cards with Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((group, idx) => {
          const cfg = trendConfig[group.latestTrend] || trendConfig.insufficient_data;
          const Icon = cfg.icon;
          const chartData = [...group.data].sort((a, b) => a.date.localeCompare(b.date));
          return (
            <Card key={idx} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">{group.client}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{group.metric}{group.unit ? ` (${group.unit})` : ''}</p>
                  </div>
                  <Badge className={cfg.color}><Icon className="w-3 h-3 mr-1 inline" />{cfg.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => format(new Date(d), 'dd/MM')} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v, group.metric]} labelFormatter={l => format(new Date(l), 'dd MMM yyyy')} />
                      <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="Value" />
                      {chartData[0]?.target !== undefined && <Line type="monotone" dataKey="target" stroke="#e11d48" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Target" />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">{chartData.length} data point(s) — log more to see trend chart</p>
                )}
                {group.latestInsight && (
                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 flex gap-2">
                    <Sparkles className="w-3 h-3 mt-0.5 text-purple-500 flex-shrink-0" />
                    <span>{group.latestInsight}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Target className="w-10 h-10 mx-auto mb-2" />
          <p>No goal metrics logged. Click "Log Progress" to begin tracking outcomes.</p>
        </div>
      )}

      {/* Log Progress Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Log Goal Metric Progress</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>NDIS Domain</Label>
              <Select value={formData.ndis_domain} onValueChange={(v) => setFormData({ ...formData, ndis_domain: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['daily_activities','learning','work','social_community','health_wellbeing','home_living','choice_control'].map(d => (
                    <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Goal Description</Label>
              <Input value={formData.goal_description} onChange={e => setFormData({ ...formData, goal_description: e.target.value })} placeholder="What NDIS goal is this metric tracking?" />
            </div>
            <div>
              <Label>Metric Name *</Label>
              <Input value={formData.metric_name} onChange={e => setFormData({ ...formData, metric_name: e.target.value })} placeholder="e.g. Tantrum frequency" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={formData.metric_unit} onChange={e => setFormData({ ...formData, metric_unit: e.target.value })} placeholder="e.g. per week, %, rating 1-5" />
            </div>
            <div>
              <Label>Baseline Value</Label>
              <Input type="number" value={formData.baseline_value} onChange={e => setFormData({ ...formData, baseline_value: e.target.value })} />
            </div>
            <div>
              <Label>Target Value</Label>
              <Input type="number" value={formData.target_value} onChange={e => setFormData({ ...formData, target_value: e.target.value })} />
            </div>
            <div>
              <Label>Current Value *</Label>
              <Input type="number" value={formData.current_value} onChange={e => setFormData({ ...formData, current_value: e.target.value })} />
            </div>
            <div>
              <Label>Measurement Date *</Label>
              <Input type="date" value={formData.measurement_date} onChange={e => setFormData({ ...formData, measurement_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={!formData.client_id || !formData.metric_name || !formData.current_value || isLogging} onClick={handleLogMetric}>
              {isLogging ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing...</> : 'Log & Analyse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}