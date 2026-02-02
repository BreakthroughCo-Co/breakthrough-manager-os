import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PieChart, BarChart3, LineChart, Table2, Hash, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const WIDGET_TYPES = [
  { id: 'metric', name: 'Metric Card', icon: Hash, description: 'Single value display' },
  { id: 'pie', name: 'Pie Chart', icon: PieChart, description: 'Distribution breakdown' },
  { id: 'bar', name: 'Bar Chart', icon: BarChart3, description: 'Comparison view' },
  { id: 'line', name: 'Line Chart', icon: LineChart, description: 'Trend over time' },
  { id: 'area', name: 'Area Chart', icon: TrendingUp, description: 'Volume trend' },
  { id: 'table', name: 'Data Table', icon: Table2, description: 'Detailed records' },
];

const ENTITY_CONFIG = {
  Client: {
    name: 'Clients',
    groupFields: ['status', 'service_type', 'risk_level'],
    valueFields: ['funding_allocated', 'funding_utilised'],
    tableFields: [
      { key: 'full_name', label: 'Name' },
      { key: 'status', label: 'Status' },
      { key: 'service_type', label: 'Service' },
      { key: 'plan_end_date', label: 'Plan End', format: 'date' },
    ],
  },
  Practitioner: {
    name: 'Practitioners',
    groupFields: ['role', 'status'],
    valueFields: ['current_caseload', 'billable_hours_actual', 'billable_hours_target'],
    tableFields: [
      { key: 'full_name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'current_caseload', label: 'Caseload' },
      { key: 'status', label: 'Status' },
    ],
  },
  BillingRecord: {
    name: 'Billing',
    groupFields: ['status', 'service_type'],
    valueFields: ['total_amount', 'duration_hours'],
    tableFields: [
      { key: 'client_name', label: 'Client' },
      { key: 'service_date', label: 'Date', format: 'date' },
      { key: 'total_amount', label: 'Amount', format: 'currency' },
      { key: 'status', label: 'Status' },
    ],
  },
  Task: {
    name: 'Tasks',
    groupFields: ['status', 'priority', 'category'],
    valueFields: [],
    tableFields: [
      { key: 'title', label: 'Task' },
      { key: 'priority', label: 'Priority' },
      { key: 'due_date', label: 'Due', format: 'date' },
      { key: 'status', label: 'Status' },
    ],
  },
  ComplianceItem: {
    name: 'Compliance',
    groupFields: ['status', 'category', 'priority'],
    valueFields: [],
    tableFields: [
      { key: 'title', label: 'Item' },
      { key: 'category', label: 'Category' },
      { key: 'due_date', label: 'Due', format: 'date' },
      { key: 'status', label: 'Status' },
    ],
  },
  Program: {
    name: 'Programs',
    groupFields: ['status', 'type'],
    valueFields: ['revenue_actual', 'revenue_target', 'current_participants'],
    tableFields: [
      { key: 'name', label: 'Program' },
      { key: 'type', label: 'Type' },
      { key: 'current_participants', label: 'Participants' },
      { key: 'status', label: 'Status' },
    ],
  },
};

export default function WidgetBuilder({ open, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [widgetType, setWidgetType] = useState(null);
  const [entity, setEntity] = useState('');
  const [title, setTitle] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [aggregation, setAggregation] = useState('count');
  const [valueField, setValueField] = useState('');
  const [format, setFormat] = useState('number');
  const [selectedTableFields, setSelectedTableFields] = useState([]);

  const resetForm = () => {
    setStep(1);
    setWidgetType(null);
    setEntity('');
    setTitle('');
    setGroupBy('');
    setAggregation('count');
    setValueField('');
    setFormat('number');
    setSelectedTableFields([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    const widget = {
      id: `widget_${Date.now()}`,
      type: widgetType,
      title: title || `${ENTITY_CONFIG[entity]?.name} ${widgetType}`,
      config: {
        entity,
        groupBy,
        aggregation,
        valueField,
        format,
        fields: selectedTableFields.length > 0 ? selectedTableFields : ENTITY_CONFIG[entity]?.tableFields,
        limit: 10,
      },
    };
    onSave(widget);
    handleClose();
  };

  const entityConfig = entity ? ENTITY_CONFIG[entity] : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Widget - Step {step} of 2</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <Label>Select Widget Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {WIDGET_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setWidgetType(type.id)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all hover:shadow-md",
                    widgetType === type.id ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:border-teal-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      widgetType === type.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      <type.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{type.name}</p>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div>
              <Label>Widget Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Active Clients by Status"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Data Source (Entity)</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select entity" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {entity && widgetType !== 'table' && (
              <>
                <div>
                  <Label>Group By</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {entityConfig?.groupFields.map(field => (
                        <SelectItem key={field} value={field} className="capitalize">{field.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Aggregation</Label>
                  <Select value={aggregation} onValueChange={setAggregation}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(aggregation === 'sum' || aggregation === 'avg') && entityConfig?.valueFields.length > 0 && (
                  <div>
                    <Label>Value Field</Label>
                    <Select value={valueField} onValueChange={setValueField}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent>
                        {entityConfig.valueFields.map(field => (
                          <SelectItem key={field} value={field} className="capitalize">{field.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {widgetType === 'metric' && (
                  <div>
                    <Label>Display Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="currency">Currency ($)</SelectItem>
                        <SelectItem value="percent">Percentage (%)</SelectItem>
                        <SelectItem value="hours">Hours (h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {entity && widgetType === 'table' && (
              <div>
                <Label>Table Columns</Label>
                <div className="mt-2 space-y-2">
                  {entityConfig?.tableFields.map(field => (
                    <div key={field.key} className="flex items-center gap-2">
                      <Checkbox
                        id={field.key}
                        checked={selectedTableFields.some(f => f.key === field.key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTableFields([...selectedTableFields, field]);
                          } else {
                            setSelectedTableFields(selectedTableFields.filter(f => f.key !== field.key));
                          }
                        }}
                      />
                      <label htmlFor={field.key} className="text-sm">{field.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!widgetType}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button 
                onClick={handleSave} 
                disabled={!entity || (!groupBy && widgetType !== 'table')}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Add Widget
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}