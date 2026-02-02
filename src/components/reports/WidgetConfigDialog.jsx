import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PieChart, BarChart3, TrendingUp, Table2, Hash, AreaChart } from 'lucide-react';

const ENTITY_CONFIG = {
  Client: {
    name: 'Clients',
    dateField: 'created_date',
    groupFields: [
      { key: 'status', label: 'Status' },
      { key: 'service_type', label: 'Service Type' },
      { key: 'risk_level', label: 'Risk Level' },
    ],
    valueFields: [
      { key: 'funding_allocated', label: 'Funding Allocated' },
      { key: 'funding_utilised', label: 'Funding Used' },
    ]
  },
  Practitioner: {
    name: 'Practitioners',
    dateField: 'start_date',
    groupFields: [
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
    ],
    valueFields: [
      { key: 'current_caseload', label: 'Caseload' },
      { key: 'billable_hours_actual', label: 'Billable Hours' },
    ]
  },
  BillingRecord: {
    name: 'Billing Records',
    dateField: 'service_date',
    groupFields: [
      { key: 'status', label: 'Status' },
      { key: 'service_type', label: 'Service Type' },
    ],
    valueFields: [
      { key: 'total_amount', label: 'Amount' },
      { key: 'duration_hours', label: 'Hours' },
    ]
  },
  Task: {
    name: 'Tasks',
    dateField: 'due_date',
    groupFields: [
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'category', label: 'Category' },
    ],
    valueFields: []
  },
  ComplianceItem: {
    name: 'Compliance Items',
    dateField: 'due_date',
    groupFields: [
      { key: 'status', label: 'Status' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
    ],
    valueFields: []
  },
  Program: {
    name: 'Programs',
    dateField: 'start_date',
    groupFields: [
      { key: 'status', label: 'Status' },
      { key: 'type', label: 'Type' },
    ],
    valueFields: [
      { key: 'revenue_target', label: 'Revenue Target' },
      { key: 'revenue_actual', label: 'Revenue Actual' },
      { key: 'current_participants', label: 'Participants' },
    ]
  },
};

const VISUALIZATIONS = [
  { key: 'pie', label: 'Pie Chart', icon: PieChart },
  { key: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { key: 'line', label: 'Line Chart', icon: TrendingUp },
  { key: 'area', label: 'Area Chart', icon: AreaChart },
  { key: 'metric', label: 'Single Metric', icon: Hash },
  { key: 'table', label: 'Table', icon: Table2 },
];

const TIMEFRAMES = [
  { key: 'last_7_days', label: 'Last 7 Days' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'all_time', label: 'All Time' },
];

const SIZES = [
  { key: 'small', label: 'Small (1 column)' },
  { key: 'medium', label: 'Medium (2 columns)' },
  { key: 'large', label: 'Large (3 columns)' },
  { key: 'full', label: 'Full Width' },
];

export default function WidgetConfigDialog({ open, onOpenChange, widget, onSave }) {
  const [config, setConfig] = useState({
    title: '',
    entity: 'Client',
    visualization: 'pie',
    groupBy: 'status',
    valueField: '',
    aggregation: 'count',
    timeframe: 'all_time',
    showTrend: false,
    size: 'medium',
  });

  useEffect(() => {
    if (widget) {
      setConfig(widget);
    } else {
      setConfig({
        title: '',
        entity: 'Client',
        visualization: 'pie',
        groupBy: 'status',
        valueField: '',
        aggregation: 'count',
        timeframe: 'all_time',
        showTrend: false,
        size: 'medium',
      });
    }
  }, [widget, open]);

  const entityConfig = ENTITY_CONFIG[config.entity];

  const handleSave = () => {
    onSave({
      ...config,
      id: widget?.id || `widget_${Date.now()}`,
      dateField: entityConfig?.dateField || 'created_date',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{widget ? 'Edit Widget' : 'Add Widget'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Widget Title</Label>
            <Input
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="e.g., Clients by Status"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Source</Label>
              <Select
                value={config.entity}
                onValueChange={(v) => setConfig({ 
                  ...config, 
                  entity: v, 
                  groupBy: ENTITY_CONFIG[v].groupFields[0]?.key || '',
                  valueField: ''
                })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Visualization</Label>
              <Select
                value={config.visualization}
                onValueChange={(v) => setConfig({ ...config, visualization: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISUALIZATIONS.map((viz) => (
                    <SelectItem key={viz.key} value={viz.key}>
                      <div className="flex items-center gap-2">
                        <viz.icon className="w-4 h-4" />
                        {viz.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Group By</Label>
              <Select
                value={config.groupBy}
                onValueChange={(v) => setConfig({ ...config, groupBy: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entityConfig?.groupFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Aggregation</Label>
              <Select
                value={config.aggregation}
                onValueChange={(v) => setConfig({ ...config, aggregation: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(config.aggregation === 'sum' || config.aggregation === 'average') && entityConfig?.valueFields.length > 0 && (
            <div>
              <Label>Value Field</Label>
              <Select
                value={config.valueField}
                onValueChange={(v) => setConfig({ ...config, valueField: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
                <SelectContent>
                  {entityConfig.valueFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time Range</Label>
              <Select
                value={config.timeframe}
                onValueChange={(v) => setConfig({ ...config, timeframe: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.key} value={tf.key}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Widget Size</Label>
              <Select
                value={config.size}
                onValueChange={(v) => setConfig({ ...config, size: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem key={size.key} value={size.key}>{size.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {config.visualization === 'metric' && (
            <div className="flex items-center justify-between">
              <Label>Show Trend Indicator</Label>
              <Switch
                checked={config.showTrend}
                onCheckedChange={(v) => setConfig({ ...config, showTrend: v })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!config.title} className="bg-teal-600 hover:bg-teal-700">
            {widget ? 'Update Widget' : 'Add Widget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}