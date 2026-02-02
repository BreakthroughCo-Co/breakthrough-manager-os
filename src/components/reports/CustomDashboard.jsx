import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Clock,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Play,
  Pause,
  Settings,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DashboardWidget from './DashboardWidget';
import WidgetBuilder from './WidgetBuilder';

const TIMEFRAME_OPTIONS = [
  { value: 'last_7_days', label: 'Last 7 Days', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { value: 'last_30_days', label: 'Last 30 Days', getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { value: 'last_90_days', label: 'Last 90 Days', getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { value: 'this_month', label: 'This Month', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { value: 'this_quarter', label: 'This Quarter', getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { value: 'this_year', label: 'This Year', getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { value: 'all_time', label: 'All Time', getRange: () => ({ from: null, to: null }) },
];

const LAYOUT_OPTIONS = [
  { value: 'grid_2', label: '2 Columns', cols: 2 },
  { value: 'grid_3', label: '3 Columns', cols: 3 },
  { value: 'grid_4', label: '4 Columns', cols: 4 },
];

export default function CustomDashboard() {
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [timeframe, setTimeframe] = useState('last_30_days');
  const [layout, setLayout] = useState('grid_2');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [showWidgetBuilder, setShowWidgetBuilder] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const queryClient = useQueryClient();

  // Fetch saved dashboards
  const { data: dashboards = [] } = useQuery({
    queryKey: ['dashboardConfigs'],
    queryFn: () => base44.entities.DashboardConfig.list('-created_date')
  });

  // Fetch all entity data
  const { data: clients = [], refetch: refetchClients } = useQuery({ 
    queryKey: ['clients'], 
    queryFn: () => base44.entities.Client.list() 
  });
  const { data: practitioners = [], refetch: refetchPractitioners } = useQuery({ 
    queryKey: ['practitioners'], 
    queryFn: () => base44.entities.Practitioner.list() 
  });
  const { data: billingRecords = [], refetch: refetchBilling } = useQuery({ 
    queryKey: ['billing'], 
    queryFn: () => base44.entities.BillingRecord.list() 
  });
  const { data: tasks = [], refetch: refetchTasks } = useQuery({ 
    queryKey: ['tasks'], 
    queryFn: () => base44.entities.Task.list() 
  });
  const { data: complianceItems = [], refetch: refetchCompliance } = useQuery({ 
    queryKey: ['compliance'], 
    queryFn: () => base44.entities.ComplianceItem.list() 
  });
  const { data: programs = [], refetch: refetchPrograms } = useQuery({ 
    queryKey: ['programs'], 
    queryFn: () => base44.entities.Program.list() 
  });

  const dataMap = useMemo(() => ({
    Client: clients,
    Practitioner: practitioners,
    BillingRecord: billingRecords,
    Task: tasks,
    ComplianceItem: complianceItems,
    Program: programs,
  }), [clients, practitioners, billingRecords, tasks, complianceItems, programs]);

  // Save dashboard mutation
  const saveMutation = useMutation({
    mutationFn: (data) => selectedDashboard 
      ? base44.entities.DashboardConfig.update(selectedDashboard.id, data)
      : base44.entities.DashboardConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfigs'] });
      setShowSaveDialog(false);
      setIsEditing(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DashboardConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfigs'] });
      setSelectedDashboard(null);
      setWidgets([]);
    }
  });

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Load dashboard when selected
  useEffect(() => {
    if (selectedDashboard) {
      try {
        setWidgets(JSON.parse(selectedDashboard.widgets || '[]'));
        setTimeframe(selectedDashboard.timeframe || 'last_30_days');
        setLayout(selectedDashboard.layout || 'grid_2');
        setAutoRefresh(selectedDashboard.auto_refresh || false);
        setRefreshInterval(selectedDashboard.refresh_interval || 5);
        setDashboardName(selectedDashboard.name);
        setDashboardDescription(selectedDashboard.description || '');
      } catch {}
    }
  }, [selectedDashboard]);

  const handleRefresh = async () => {
    await Promise.all([
      refetchClients(),
      refetchPractitioners(),
      refetchBilling(),
      refetchTasks(),
      refetchCompliance(),
      refetchPrograms(),
    ]);
    setLastRefresh(new Date());
  };

  const handleAddWidget = (widget) => {
    setWidgets([...widgets, widget]);
  };

  const handleRemoveWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: dashboardName,
      description: dashboardDescription,
      widgets: JSON.stringify(widgets),
      timeframe,
      layout,
      auto_refresh: autoRefresh,
      refresh_interval: refreshInterval,
    });
  };

  const handleNewDashboard = () => {
    setSelectedDashboard(null);
    setWidgets([]);
    setDashboardName('New Dashboard');
    setDashboardDescription('');
    setTimeframe('last_30_days');
    setLayout('grid_2');
    setAutoRefresh(false);
    setIsEditing(true);
  };

  // Filter data by timeframe
  const getFilteredData = (entity) => {
    const data = dataMap[entity] || [];
    const timeframeConfig = TIMEFRAME_OPTIONS.find(t => t.value === timeframe);
    if (!timeframeConfig || timeframe === 'all_time') return data;

    const { from, to } = timeframeConfig.getRange();
    const dateField = {
      Client: 'created_date',
      Practitioner: 'created_date',
      BillingRecord: 'service_date',
      Task: 'created_date',
      ComplianceItem: 'created_date',
      Program: 'created_date',
    }[entity] || 'created_date';

    return data.filter(item => {
      if (!item[dateField]) return true;
      const date = new Date(item[dateField]);
      return (!from || date >= from) && (!to || date <= to);
    });
  };

  const layoutCols = LAYOUT_OPTIONS.find(l => l.value === layout)?.cols || 2;

  return (
    <div className="space-y-6">
      {/* Dashboard Selector & Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Select 
            value={selectedDashboard?.id || ''} 
            onValueChange={(id) => setSelectedDashboard(dashboards.find(d => d.id === id))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a dashboard" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    {d.is_default && <Star className="w-3 h-3 text-amber-500" />}
                    {d.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleNewDashboard}>
          <Plus className="w-4 h-4 mr-2" />
          New Dashboard
        </Button>

        {(selectedDashboard || widgets.length > 0) && (
          <>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            {selectedDashboard && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                    <Settings className="w-4 h-4 mr-2" />
                    {isEditing ? 'Exit Edit Mode' : 'Edit Dashboard'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteMutation.mutate(selectedDashboard.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Dashboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {/* Edit Mode Controls */}
      {isEditing && (
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Layout:</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger className="w-32">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label className="text-sm">Auto-refresh</Label>
                {autoRefresh && (
                  <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 min</SelectItem>
                      <SelectItem value="5">5 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex-1" />

              <Button variant="outline" onClick={() => setShowWidgetBuilder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Widget
              </Button>

              <Button onClick={() => setShowSaveDialog(true)} className="bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4 mr-2" />
                Save Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      {(selectedDashboard || widgets.length > 0) && (
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
          {autoRefresh && (
            <Badge variant="outline" className="text-teal-600 border-teal-300">
              <Play className="w-3 h-3 mr-1" />
              Auto-refresh: {refreshInterval}min
            </Badge>
          )}
          <span>{widgets.length} widgets</span>
        </div>
      )}

      {/* Widgets Grid */}
      {widgets.length > 0 ? (
        <div className={cn(
          "grid gap-4",
          layoutCols === 2 && "grid-cols-1 md:grid-cols-2",
          layoutCols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          layoutCols === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {widgets.map(widget => (
            <DashboardWidget
              key={widget.id}
              widget={widget}
              data={getFilteredData(widget.config.entity)}
              onRemove={() => handleRemoveWidget(widget.id)}
              isEditing={isEditing}
            />
          ))}
        </div>
      ) : (
        <Card className="py-16">
          <CardContent className="text-center">
            <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">No widgets configured</p>
            <p className="text-sm text-slate-400 mb-4">
              {selectedDashboard ? 'Add widgets to customize this dashboard' : 'Select or create a dashboard to get started'}
            </p>
            {isEditing && (
              <Button onClick={() => setShowWidgetBuilder(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Widget
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Widget Builder Dialog */}
      <WidgetBuilder
        open={showWidgetBuilder}
        onClose={() => setShowWidgetBuilder(false)}
        onSave={handleAddWidget}
      />

      {/* Save Dashboard Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDashboard ? 'Update Dashboard' : 'Save Dashboard'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Dashboard Name</Label>
              <Input
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="e.g., Monthly Operations Overview"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                placeholder="Brief description of this dashboard"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={!dashboardName || saveMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedDashboard ? 'Update' : 'Save'} Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}