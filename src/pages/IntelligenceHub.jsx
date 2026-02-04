import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  Search,
  FileText,
  Brain,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Shield,
  Sparkles
} from 'lucide-react';

export default function IntelligenceHub() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [contextType, setContextType] = useState('general');
  const [entityId, setEntityId] = useState('');
  const [stakeholderType, setStakeholderType] = useState('management');
  const [reportPeriod, setReportPeriod] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Knowledge Base Query
  const queryKBMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('queryKnowledgeBase', {
        query,
        context_type: contextType,
        entity_id: entityId
      });
      return response.data;
    }
  });

  // Stakeholder Report Generation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateStakeholderReport', {
        stakeholder_type: stakeholderType,
        report_period_start: reportPeriod.start,
        report_period_end: reportPeriod.end,
        focus_areas: [],
        include_sections: []
      });
      return response.data;
    }
  });

  // Recent summaries
  const { data: recentIncidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 10)
  });

  const { data: recentReports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.MonthlyPerformanceReport.list('-generated_date', 10)
  });

  const { data: kbArticles = [] } = useQuery({
    queryKey: ['kb-articles'],
    queryFn: () => base44.entities.KnowledgeBaseArticle.filter({ is_current: true })
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className={cn(
          "text-2xl font-bold transition-colors",
          isDark ? "text-slate-50" : "text-slate-900"
        )}>
          Intelligence Hub
        </h2>
        <p className={cn(
          "mt-1 transition-colors",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>
          AI-powered knowledge base, automated reporting, and document intelligence
        </p>
      </div>

      <Tabs defaultValue="knowledge" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="knowledge">
            <Brain className="h-4 w-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="summaries">
            <Sparkles className="h-4 w-4 mr-2" />
            Summaries
          </TabsTrigger>
        </TabsList>

        {/* Knowledge Base Query */}
        <TabsContent value="knowledge" className="space-y-6">
          <Card className={cn(
            "transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-teal-600" />
                Natural Language Query
              </CardTitle>
              <CardDescription>
                Ask questions about clients, compliance, team performance, or operational procedures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select value={contextType} onValueChange={setContextType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Context Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Knowledge</SelectItem>
                    <SelectItem value="client">Client Context</SelectItem>
                    <SelectItem value="practitioner">Practitioner Context</SelectItem>
                    <SelectItem value="compliance">Compliance Context</SelectItem>
                  </SelectContent>
                </Select>
                
                {(contextType === 'client' || contextType === 'practitioner') && (
                  <Input
                    placeholder="Entity ID (optional)"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question... e.g., 'What are the NDIS requirements for restrictive practices?'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && query && queryKBMutation.mutate()}
                  className="flex-1"
                />
                <Button
                  onClick={() => queryKBMutation.mutate()}
                  disabled={!query || queryKBMutation.isPending}
                >
                  {queryKBMutation.isPending ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {queryKBMutation.data && (
                <div className="mt-6 space-y-4">
                  <div className={cn(
                    "p-4 rounded-lg border",
                    isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className={cn(
                        "font-semibold",
                        isDark ? "text-slate-50" : "text-slate-900"
                      )}>Answer</h4>
                      <Badge variant="outline">
                        Confidence: {queryKBMutation.data.result.confidence_score}%
                      </Badge>
                    </div>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      isDark ? "text-slate-300" : "text-slate-600"
                    )}>
                      {queryKBMutation.data.result.answer}
                    </p>
                  </div>

                  {queryKBMutation.data.result.recommendations?.length > 0 && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      isDark ? "bg-teal-950 border-teal-900" : "bg-teal-50 border-teal-200"
                    )}>
                      <h4 className={cn(
                        "font-semibold mb-2 flex items-center gap-2",
                        isDark ? "text-teal-300" : "text-teal-900"
                      )}>
                        <CheckCircle2 className="h-4 w-4" />
                        Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {queryKBMutation.data.result.recommendations.map((rec, idx) => (
                          <li key={idx} className={cn(
                            "text-sm",
                            isDark ? "text-teal-200" : "text-teal-700"
                          )}>
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {queryKBMutation.data.result.compliance_flags?.length > 0 && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      isDark ? "bg-amber-950 border-amber-900" : "bg-amber-50 border-amber-200"
                    )}>
                      <h4 className={cn(
                        "font-semibold mb-2 flex items-center gap-2",
                        isDark ? "text-amber-300" : "text-amber-900"
                      )}>
                        <AlertCircle className="h-4 w-4" />
                        Compliance Considerations
                      </h4>
                      <ul className="space-y-1">
                        {queryKBMutation.data.result.compliance_flags.map((flag, idx) => (
                          <li key={idx} className={cn(
                            "text-sm",
                            isDark ? "text-amber-200" : "text-amber-700"
                          )}>
                            • {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {queryKBMutation.data.referenced_articles?.length > 0 && (
                    <div>
                      <h4 className={cn(
                        "font-semibold mb-2",
                        isDark ? "text-slate-300" : "text-slate-700"
                      )}>Referenced Articles</h4>
                      <div className="space-y-2">
                        {queryKBMutation.data.referenced_articles.map((article) => (
                          <div key={article.id} className={cn(
                            "p-3 rounded-lg border text-sm",
                            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                          )}>
                            <div className="flex items-start justify-between">
                              <span className="font-medium">{article.title}</span>
                              <Badge variant="outline">{article.category}</Badge>
                            </div>
                            <p className={cn(
                              "text-xs mt-1",
                              isDark ? "text-slate-400" : "text-slate-500"
                            )}>
                              {article.source}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn(
            "transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
          )}>
            <CardHeader>
              <CardTitle>Knowledge Base Coverage</CardTitle>
              <CardDescription>{kbArticles.length} active articles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['NDIS Policy', 'Practice Standards', 'Compliance', 'Best Practices', 'Operational Procedures'].map((cat) => {
                  const count = kbArticles.filter(a => a.category === cat).length;
                  return (
                    <div key={cat} className={cn(
                      "p-3 rounded-lg border",
                      isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="text-2xl font-bold text-teal-600">{count}</div>
                      <div className={cn(
                        "text-xs",
                        isDark ? "text-slate-400" : "text-slate-500"
                      )}>{cat}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automated Reports */}
        <TabsContent value="reports" className="space-y-6">
          <Card className={cn(
            "transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Generate Stakeholder Report
              </CardTitle>
              <CardDescription>
                AI-generated reports customized for different audiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Stakeholder Type</label>
                  <Select value={stakeholderType} onValueChange={setStakeholderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="management">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Management (Operational)
                        </div>
                      </SelectItem>
                      <SelectItem value="compliance_body">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Compliance Body
                        </div>
                      </SelectItem>
                      <SelectItem value="funder">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Funder (Outcomes)
                        </div>
                      </SelectItem>
                      <SelectItem value="board">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Board (Strategic)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Report Period</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={reportPeriod.start}
                      onChange={(e) => setReportPeriod({ ...reportPeriod, start: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={reportPeriod.end}
                      onChange={(e) => setReportPeriod({ ...reportPeriod, end: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => generateReportMutation.mutate()}
                disabled={generateReportMutation.isPending}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generateReportMutation.isPending ? 'Generating Report...' : 'Generate Report'}
              </Button>

              {generateReportMutation.data && (
                <div className="mt-6 space-y-4">
                  <div className={cn(
                    "p-4 rounded-lg border",
                    isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{generateReportMutation.data.title}</h3>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Executive Summary</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {generateReportMutation.data.report.executive_summary}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Key Metrics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {generateReportMutation.data.report.key_metrics?.slice(0, 4).map((metric, idx) => (
                            <div key={idx} className={cn(
                              "p-3 rounded-lg",
                              isDark ? "bg-slate-900" : "bg-white"
                            )}>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{metric.metric}</div>
                              <div className="text-xl font-bold">{metric.value}</div>
                              <div className="text-xs text-teal-600">{metric.trend}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Key Recommendations</h4>
                        <ul className="space-y-1">
                          {generateReportMutation.data.report.recommendations?.slice(0, 5).map((rec, idx) => (
                            <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                              {idx + 1}. {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn(
            "transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
          )}>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentReports.slice(0, 5).map((report) => (
                  <div key={report.id} className={cn(
                    "p-3 rounded-lg border flex items-center justify-between",
                    isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {report.report_type?.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {report.report_period_month} • {report.status}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Summaries */}
        <TabsContent value="summaries" className="space-y-6">
          <Card className={cn(
            "transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                AI Document Summaries
              </CardTitle>
              <CardDescription>
                Quick overviews of incidents, case notes, and audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentIncidents.filter(i => i.ai_summary).slice(0, 5).map((incident) => (
                  <div key={incident.id} className={cn(
                    "p-4 rounded-lg border",
                    isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          incident.severity === 'critical' ? 'bg-red-600' :
                          incident.severity === 'serious_injury' ? 'bg-orange-600' :
                          'bg-yellow-600'
                        }>
                          {incident.severity}
                        </Badge>
                        <span className="text-sm font-medium">{incident.client_name}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(incident.incident_date).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {incident.ai_summary || incident.description.substring(0, 150)}...
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">Risk: {incident.risk_score}</Badge>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}