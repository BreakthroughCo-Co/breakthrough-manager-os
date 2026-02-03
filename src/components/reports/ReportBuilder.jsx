import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, X, BarChart3, LineChart, PieChart, Table, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportBuilder({ onSave }) {
  const [reportName, setReportName] = useState('');
  const [reportCategory, setReportCategory] = useState('custom');
  const [selectedDataPoints, setSelectedDataPoints] = useState([]);
  const [charts, setCharts] = useState([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const availableDataPoints = [
    { entity: 'Client', field: 'status', label: 'Client Status', type: 'categorical' },
    { entity: 'Client', field: 'service_type', label: 'Service Type', type: 'categorical' },
    { entity: 'Client', field: 'risk_level', label: 'Risk Level', type: 'categorical' },
    { entity: 'BillingRecord', field: 'total_amount', label: 'Billing Amount', type: 'numeric' },
    { entity: 'BillingRecord', field: 'status', label: 'Billing Status', type: 'categorical' },
    { entity: 'Incident', field: 'severity', label: 'Incident Severity', type: 'categorical' },
    { entity: 'Incident', field: 'category', label: 'Incident Category', type: 'categorical' },
    { entity: 'CaseNote', field: 'progress_rating', label: 'Progress Rating', type: 'categorical' },
    { entity: 'ComplianceItem', field: 'status', label: 'Compliance Status', type: 'categorical' },
    { entity: 'Practitioner', field: 'status', label: 'Practitioner Status', type: 'categorical' },
  ];

  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'table', label: 'Data Table', icon: Table },
  ];

  const handleToggleDataPoint = (dataPoint) => {
    setSelectedDataPoints(prev => {
      const exists = prev.find(p => p.entity === dataPoint.entity && p.field === dataPoint.field);
      if (exists) {
        return prev.filter(p => !(p.entity === dataPoint.entity && p.field === dataPoint.field));
      } else {
        return [...prev, dataPoint];
      }
    });
  };

  const handleAddChart = () => {
    setCharts([...charts, {
      id: Date.now(),
      title: '',
      type: 'bar',
      dataPoint: null,
      groupBy: null,
      filters: []
    }]);
  };

  const handleUpdateChart = (chartId, updates) => {
    setCharts(charts.map(c => c.id === chartId ? { ...c, ...updates } : c));
  };

  const handleRemoveChart = (chartId) => {
    setCharts(charts.filter(c => c.id !== chartId));
  };

  const handleGetAISuggestions = async () => {
    if (selectedDataPoints.length === 0) {
      toast.error('Please select at least one data point');
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      const result = await base44.functions.invoke('suggestReportOptimizations', {
        data_points: selectedDataPoints,
        report_category: reportCategory
      });
      setSuggestions(result.data.suggestions);
      toast.success('AI suggestions generated');
    } catch (error) {
      toast.error('Failed to generate suggestions: ' + error.message);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName || selectedDataPoints.length === 0) {
      toast.error('Please provide a report name and select data points');
      return;
    }

    const user = await base44.auth.me();
    const reportTemplate = {
      template_name: reportName,
      report_category: reportCategory,
      data_points: JSON.stringify(selectedDataPoints),
      visualization_config: JSON.stringify({
        charts: charts.map(c => ({
          title: c.title,
          type: c.type,
          data_point: c.dataPoint,
          group_by: c.groupBy,
          filters: c.filters
        }))
      }),
      filters: JSON.stringify({}),
      created_by: user.email,
      is_active: true
    };

    await base44.entities.ReportTemplate.create(reportTemplate);
    toast.success('Report template saved');
    if (onSave) onSave();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Define your custom report structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Report Name *</Label>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g., Monthly Performance Dashboard"
            />
          </div>

          <div>
            <Label>Report Category</Label>
            <Select value={reportCategory} onValueChange={setReportCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="client_demographics">Client Demographics</SelectItem>
                <SelectItem value="service_utilization">Service Utilization</SelectItem>
                <SelectItem value="incident_patterns">Incident Patterns</SelectItem>
                <SelectItem value="compliance_summary">Compliance Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Points</CardTitle>
              <CardDescription>Select the data you want to include</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGetAISuggestions}
              disabled={selectedDataPoints.length === 0 || isGeneratingSuggestions}
            >
              {isGeneratingSuggestions ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Get AI Suggestions
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableDataPoints.map((dp, idx) => {
              const isSelected = selectedDataPoints.some(p => p.entity === dp.entity && p.field === dp.field);
              return (
                <div
                  key={idx}
                  onClick={() => handleToggleDataPoint(dp)}
                  className={`cursor-pointer border rounded-lg p-3 transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox checked={isSelected} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{dp.label}</p>
                      <p className="text-xs text-muted-foreground">{dp.entity}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDataPoints.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium mb-2">Selected ({selectedDataPoints.length}):</p>
              <div className="flex flex-wrap gap-1">
                {selectedDataPoints.map((dp, idx) => (
                  <Badge key={idx} variant="secondary">
                    {dp.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {suggestions && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Sparkles className="w-5 h-5" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.recommended_charts && suggestions.recommended_charts.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Recommended Visualizations:</p>
                <div className="space-y-2">
                  {suggestions.recommended_charts.slice(0, 5).map((rec, idx) => (
                    <div key={idx} className="bg-white rounded p-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{rec.data_point}</span>
                        <Badge variant="outline">{rec.chart_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.best_practices && suggestions.best_practices.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Best Practices:</p>
                <ul className="space-y-1 text-sm">
                  {suggestions.best_practices.map((practice, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>{practice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visualizations</CardTitle>
              <CardDescription>Configure charts and displays</CardDescription>
            </div>
            <Button size="sm" onClick={handleAddChart}>
              <Plus className="w-4 h-4 mr-2" />
              Add Chart
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {charts.map((chart) => (
              <div key={chart.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Chart Title"
                    value={chart.title}
                    onChange={(e) => handleUpdateChart(chart.id, { title: e.target.value })}
                    className="flex-1 mr-2"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveChart(chart.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Chart Type</Label>
                    <Select
                      value={chart.type}
                      onValueChange={(v) => handleUpdateChart(chart.id, { type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chartTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Data Point</Label>
                    <Select
                      value={chart.dataPoint || ''}
                      onValueChange={(v) => handleUpdateChart(chart.id, { dataPoint: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select data" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDataPoints.map((dp, idx) => (
                          <SelectItem key={idx} value={`${dp.entity}.${dp.field}`}>
                            {dp.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            {charts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No visualizations added yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Preview Report</Button>
        <Button onClick={handleSaveReport}>
          Save Report Template
        </Button>
      </div>
    </div>
  );
}