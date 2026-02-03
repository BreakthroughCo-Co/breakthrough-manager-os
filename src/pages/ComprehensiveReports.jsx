import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileText, Download, Calendar, Sparkles, BarChart3, Users, AlertTriangle, Shield } from 'lucide-react';

export default function ComprehensiveReports() {
  const [selectedCategory, setSelectedCategory] = useState('client_demographics');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    report_category: 'client_demographics',
    schedule_enabled: false,
    schedule_frequency: 'weekly',
    recipients: '',
    export_format: 'pdf',
    data_points: [],
    visualization_type: 'bar_chart',
    filters: {},
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: () => base44.entities.ReportTemplate.filter({ is_active: true }),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ReportTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      setIsTemplateDialogOpen(false);
      setTemplateForm({
        template_name: '',
        report_category: 'client_demographics',
        schedule_enabled: false,
        schedule_frequency: 'weekly',
        recipients: '',
        export_format: 'pdf',
      });
    },
  });

  const handleGenerateReport = async (format = 'json') => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generateComprehensiveReport', {
        report_category: selectedCategory,
        format,
      });
      
      if (format === 'csv') {
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCategory}_${Date.now()}.csv`;
        a.click();
      } else {
        setReportResult(result.data);
      }
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    const user = await base44.auth.me();
    const recipients = templateForm.recipients.split(',').map(e => e.trim()).filter(e => e);

    await createTemplateMutation.mutateAsync({
      ...templateForm,
      recipients: JSON.stringify(recipients),
      data_points: JSON.stringify(templateForm.data_points),
      visualization_config: JSON.stringify({ type: templateForm.visualization_type }),
      filters: JSON.stringify(templateForm.filters),
      created_by: user.email,
    });
  };

  const reportCategories = [
    { value: 'client_demographics', label: 'Client Demographics', icon: Users, color: 'text-blue-600' },
    { value: 'service_utilization', label: 'Service Utilization', icon: BarChart3, color: 'text-green-600' },
    { value: 'incident_patterns', label: 'Incident Patterns', icon: AlertTriangle, color: 'text-orange-600' },
    { value: 'compliance_summary', label: 'Compliance Summary', icon: Shield, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Reports</h1>
          <p className="text-muted-foreground">AI-powered insights and analytics</p>
        </div>
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Report Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm({...templateForm, template_name: e.target.value})}
                  placeholder="e.g., Monthly Client Report"
                />
              </div>
              <div>
                <Label>Report Category</Label>
                <Select
                  value={templateForm.report_category}
                  onValueChange={(v) => setTemplateForm({...templateForm, report_category: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={templateForm.schedule_enabled}
                  onCheckedChange={(v) => setTemplateForm({...templateForm, schedule_enabled: v})}
                />
                <Label>Enable Automated Scheduling</Label>
              </div>
              {templateForm.schedule_enabled && (
                <>
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={templateForm.schedule_frequency}
                      onValueChange={(v) => setTemplateForm({...templateForm, schedule_frequency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Recipients (comma-separated)</Label>
                    <Input
                      value={templateForm.recipients}
                      onChange={(e) => setTemplateForm({...templateForm, recipients: e.target.value})}
                      placeholder="admin@example.com, manager@example.com"
                    />
                  </div>
                </>
              )}
              <div>
                <Label>Export Format</Label>
                <Select
                  value={templateForm.export_format}
                  onValueChange={(v) => setTemplateForm({...templateForm, export_format: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Points to Include</Label>
                <div className="space-y-2 mt-2">
                  {['demographics', 'incidents', 'compliance', 'utilization', 'progress'].map(dp => (
                    <div key={dp} className="flex items-center gap-2">
                      <Checkbox
                        checked={templateForm.data_points.includes(dp)}
                        onCheckedChange={(checked) => {
                          const newPoints = checked 
                            ? [...templateForm.data_points, dp]
                            : templateForm.data_points.filter(p => p !== dp);
                          setTemplateForm({...templateForm, data_points: newPoints});
                        }}
                      />
                      <Label className="capitalize">{dp}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Visualization Type</Label>
                <Select
                  value={templateForm.visualization_type}
                  onValueChange={(v) => setTemplateForm({...templateForm, visualization_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar_chart">Bar Chart</SelectItem>
                    <SelectItem value="line_chart">Line Chart</SelectItem>
                    <SelectItem value="pie_chart">Pie Chart</SelectItem>
                    <SelectItem value="table">Data Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveTemplate} disabled={!templateForm.template_name} className="w-full">
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reportCategories.map(cat => (
          <Card
            key={cat.value}
            className={`cursor-pointer transition-all ${selectedCategory === cat.value ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedCategory(cat.value)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${cat.color.split('-')[1]}-100 flex items-center justify-center`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">Generate report</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generate Report: {reportCategories.find(c => c.value === selectedCategory)?.label}</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerateReport('csv')}
                disabled={isGenerating}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => handleGenerateReport('json')}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
        {reportResult && (
          <CardContent>
            <Tabs defaultValue="data" className="space-y-4">
              <TabsList>
                <TabsTrigger value="data">Report Data</TabsTrigger>
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="data">
                <div className="space-y-4">
                  {Object.entries(reportResult.report_data).map(([key, value]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <h4 className="font-semibold capitalize mb-2">{key.replace(/_/g, ' ')}</h4>
                      {typeof value === 'object' ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(value).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-muted-foreground">{k}:</span>
                              <span className="font-medium">{v}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-2xl font-bold">{value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="insights">
                {reportResult.ai_analysis && (
                  <div className="space-y-4">
                    {Object.entries(reportResult.ai_analysis).map(([key, value]) => (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle className="text-base capitalize">{key.replace(/_/g, ' ')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {Array.isArray(value) ? (
                            <ul className="space-y-2">
                              {value.map((item, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm">{value}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates.map(template => (
              <div key={template.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium">{template.template_name}</p>
                  <p className="text-xs text-muted-foreground">{template.report_category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {template.schedule_enabled && (
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {template.schedule_frequency}
                    </Badge>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory(template.report_category);
                      handleGenerateReport('json');
                    }}
                  >
                    Run
                  </Button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No templates created yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}