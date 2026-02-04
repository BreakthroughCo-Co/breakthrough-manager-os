import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DocumentSummarizer({ documentType, documentIds, documents }) {
  const [summary, setSummary] = useState(null);
  const [summaryType, setSummaryType] = useState('comprehensive');

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('summarizeDocuments', {
        document_type: documentType,
        document_ids: documentIds,
        summary_type: summaryType
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSummary(data.summary);
    }
  });

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            AI Document Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={summaryType} onValueChange={setSummaryType}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="action_focused">Action-Focused</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={() => summarizeMutation.mutate()}
              disabled={summarizeMutation.isPending || !documentIds?.length}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {summarizeMutation.isPending ? 'Summarizing...' : 'Summarize'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <p className="text-sm text-slate-600">
            Select {documents?.length || 0} document{documents?.length !== 1 ? 's' : ''} to generate AI summary
          </p>
        ) : (
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-3">
              <div className="p-4 bg-white rounded">
                <h3 className="font-semibold text-sm mb-2">Executive Summary</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary.executive_summary}</p>
              </div>

              {summary.key_themes?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Key Themes</h3>
                  <div className="space-y-2">
                    {summary.key_themes.map((theme, idx) => (
                      <div key={idx} className="p-2 bg-white rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{theme.theme}</span>
                          <Badge variant="outline">{theme.frequency}</Badge>
                        </div>
                        <p className="text-xs text-slate-600">{theme.significance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-2">
              {summary.action_items?.map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{item.action}</span>
                    <Badge className={
                      item.priority === 'high' ? 'bg-red-600' :
                      item.priority === 'medium' ? 'bg-amber-600' :
                      'bg-green-600'
                    }>
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p><strong>Owner:</strong> {item.responsible_party}</p>
                    <p><strong>Timeline:</strong> {item.timeline}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="risks" className="space-y-2">
              {summary.risk_indicators?.map((risk, idx) => (
                <div key={idx} className="p-3 bg-white rounded border-l-4 border-red-400">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{risk.risk}</span>
                    <Badge variant="outline">{risk.severity}</Badge>
                  </div>
                  <p className="text-xs text-blue-700"><strong>Mitigation:</strong> {risk.mitigation}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}