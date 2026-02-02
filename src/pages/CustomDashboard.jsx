import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Plus,
  Save,
  Settings,
  Loader2,
  Trash2,
  Copy,
  RefreshCw,
  Star,
  StarOff,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import DashboardWidget from '@/components/reports/DashboardWidget';
import WidgetConfigDialog from '@/components/reports/WidgetConfigDialog';

export default function CustomDashboard() {
  const [widgets, setWidgets] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const queryClient = useQueryClient();

  // Fetch all data sources
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: practitioners = [] } = useQuery({ queryKey: ['practitioners'], queryFn: () => base44.entities.Practitioner.list() });
  const { data: billingRecords = [] } = useQuery({ queryKey: ['billing'], queryFn: () => base44.entities.BillingRecord.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list() });
  const { data: complianceItems = [] } = useQuery({ queryKey: ['compliance'], queryFn: () => base44.entities.ComplianceItem.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: savedDashboards = [] } = useQuery({ 
    queryKey: ['dashboardConfigs'], 
    queryFn: () => base44.entities.DashboardConfig.list('-created_date') 
  });

  const dataMap = {
    Client: clients,
    Practitioner: practitioners,
    BillingRecord: billingRecords,
    Task: tasks,
    ComplianceItem: complianceItems,
    Program: programs,
  };

  const saveDashboardMutation = useMutation({
    mutationFn: (data) => selectedDashboard 
      ? base44.entities.DashboardConfig.update(selectedDashboard.id, data)
      : base44.entities.DashboardConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfigs'] });
      setSaveDialogOpen(false);
      setDashboardName('');
      setDashboardDescription('');
    }
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: (id) => base44.entities.DashboardConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfigs'] });
      if (selectedDashboard?.id === deleteDashboardMutation.variables) {
        setSelectedDashboard(null);
        setWidgets([]);
      }
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      // Remove default from all others
      const updates = savedDashboards
        .filter(d => d.is_default && d.id !== id)
        .map(d => base44.entities.DashboardConfig.update(d.id, { is_default: false }));
      await Promise.all(updates);
      // Set this one as default
      return base44.entities.DashboardConfig.update(id, { is_default: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboardConfigs'] })
  });

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  // Load default dashboard on mount
  useEffect(() => {
    const defaultDashboard = savedDashboards.find(d => d.is_default);
    if (defaultDashboard && !selectedDashboard) {
      loadDashboard(defaultDashboard);
    }
  }, [savedDashboards]);

  const loadDashboard = (dashboard) => {
    setSelectedDashboard(dashboard);
    try {
      const layout = JSON.parse(dashboard.layout || '[]');
      setWidgets(layout);
      setAutoRefresh(dashboard.auto_refresh ?? true);
    } catch {
      setWidgets([]);
    }
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    setWidgetDialogOpen(true);
  };

  const handleEditWidget = (widget) => {
    setEditingWidget(widget);
    setWidgetDialogOpen(true);
  };

  const handleSaveWidget = (widgetConfig) => {
    if (editingWidget) {
      setWidgets(widgets.map(w => w.id === widgetConfig.id ? widgetConfig : w));
    } else {
      setWidgets([...widgets, widgetConfig]);
    }
  };

  const handleDeleteWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleSaveDashboard = () => {
    saveDashboardMutation.mutate({
      name: dashboardName || selectedDashboard?.name || 'Untitled Dashboard',
      description: dashboardDescription || selectedDashboard?.description || '',
      layout: JSON.stringify(widgets),
      auto_refresh: autoRefresh,
      refresh_interval: 5,
    });
  };

  const handleDuplicateDashboard = (dashboard) => {
    const layout = JSON.parse(dashboard.layout || '[]');
    setWidgets(layout);
    setSelectedDashboard(null);
    setDashboardName(`${dashboard.name} (Copy)`);
    setSaveDialogOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    setLastRefresh(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-teal-600" />
              Custom Dashboard
            </h2>
            <p className="text-slate-500 mt-1">
              {selectedDashboard ? selectedDashboard.name : 'Create your own dashboard with customizable widgets'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dashboard Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-between">
                {selectedDashboard?.name || 'Select Dashboard'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => { setSelectedDashboard(null); setWidgets([]); }}>
                <Plus className="w-4 h-4 mr-2" />
                New Dashboard
              </DropdownMenuItem>
              {savedDashboards.length > 0 && <DropdownMenuSeparator />}
              {savedDashboards.map(dashboard => (
                <DropdownMenuItem key={dashboard.id} onClick={() => loadDashboard(dashboard)}>
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{dashboard.name}</span>
                    {dashboard.is_default && <Star className="w-3 h-3 text-amber-500 ml-2" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh Data">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isEditing ? 'Done Editing' : 'Edit'}
          </Button>

          {isEditing && (
            <>
              <Button onClick={handleAddWidget}>
                <Plus className="w-4 h-4 mr-2" />
                Add Widget
              </Button>
              <Button 
                onClick={() => {
                  setDashboardName(selectedDashboard?.name || '');
                  setDashboardDescription(selectedDashboard?.description || '');
                  setSaveDialogOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Actions */}
      {selectedDashboard && (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
            <div className="flex items-center gap-2">
              <span>Auto-refresh</span>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDefaultMutation.mutate(selectedDashboard.id)}
              disabled={selectedDashboard.is_default}
            >
              {selectedDashboard.is_default ? (
                <><Star className="w-4 h-4 mr-1 text-amber-500" /> Default</>
              ) : (
                <><StarOff className="w-4 h-4 mr-1" /> Set as Default</>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDuplicateDashboard(selectedDashboard)}>
              <Copy className="w-4 h-4 mr-1" /> Duplicate
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-600"
              onClick={() => deleteDashboardMutation.mutate(selectedDashboard.id)}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      {widgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map(widget => (
            <DashboardWidget
              key={widget.id}
              config={widget}
              data={dataMap[widget.entity] || []}
              onEdit={handleEditWidget}
              onDelete={handleDeleteWidget}
              isEditing={isEditing}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">No Widgets Yet</h3>
            <p className="text-slate-500 mb-4">
              {isEditing 
                ? 'Click "Add Widget" to start building your dashboard'
                : 'Click "Edit" to start customizing your dashboard'
              }
            </p>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start Building
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Dashboards */}
      {!selectedDashboard && savedDashboards.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Your Saved Dashboards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savedDashboards.map(dashboard => {
              const widgetCount = JSON.parse(dashboard.layout || '[]').length;
              return (
                <Card 
                  key={dashboard.id} 
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => loadDashboard(dashboard)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                          {dashboard.name}
                          {dashboard.is_default && <Star className="w-4 h-4 text-amber-500" />}
                        </h4>
                        {dashboard.description && (
                          <p className="text-sm text-slate-500 mt-1">{dashboard.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline">{widgetCount} widgets</Badge>
                      {dashboard.auto_refresh && (
                        <Badge variant="outline" className="text-green-600">Auto-refresh</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget Config Dialog */}
      <WidgetConfigDialog
        open={widgetDialogOpen}
        onOpenChange={setWidgetDialogOpen}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />

      {/* Save Dashboard Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
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
                placeholder="e.g., Monthly Overview"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                placeholder="What is this dashboard for?"
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-refresh every 5 minutes</Label>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveDashboard} 
              disabled={!dashboardName || saveDashboardMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saveDashboardMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}