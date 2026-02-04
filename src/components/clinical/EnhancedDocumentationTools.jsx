import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sparkles, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EnhancedDocumentationTools({ caseNoteId }) {
  const [results, setResults] = useState({});

  const enhanceMutation = useMutation({
    mutationFn: async (enhancement_type) => {
      const response = await base44.functions.invoke('enhanceDocumentationWithAI', {
        case_note_id: caseNoteId,
        enhancement_type
      });
      return { type: enhancement_type, data: response.data };
    },
    onSuccess: (data) => {
      setResults(prev => ({ ...prev, [data.type]: data.data.result }));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-teal-600" />
          AI Documentation Enhancement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summarize">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="summarize">Summarize</TabsTrigger>
            <TabsTrigger value="terminology">Terminology</TabsTrigger>
            <TabsTrigger value="draft">Draft Note</TabsTrigger>
          </TabsList>

          <TabsContent value="summarize" className="space-y-3">
            <Button
              onClick={() => enhanceMutation.mutate('summarize')}
              disabled={enhanceMutation.isPending}
              size="sm"
            >
              {enhanceMutation.isPending ? 'Summarizing...' : 'Generate Summary'}
            </Button>

            {results.summarize && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Concise Summary</h4>
                <ul className="space-y-2">
                  {results.summarize.summary_bullets?.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {results.summarize.key_outcomes && (
                  <Alert className="mt-3">
                    <AlertDescription>
                      <strong>Key Outcomes:</strong> {results.summarize.key_outcomes}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="terminology" className="space-y-3">
            <Button
              onClick={() => enhanceMutation.mutate('terminology')}
              disabled={enhanceMutation.isPending}
              size="sm"
            >
              {enhanceMutation.isPending ? 'Analyzing...' : 'Review Terminology'}
            </Button>

            {results.terminology && (
              <div className="space-y-3">
                {results.terminology.suggestions?.map((suggestion, idx) => (
                  <div key={idx} className="p-3 border rounded space-y-2">
                    <div>
                      <p className="text-xs text-slate-600">Original:</p>
                      <p className="text-sm font-medium text-red-700">{suggestion.original_phrase}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">NDIS-Compliant:</p>
                      <p className="text-sm font-medium text-green-700">{suggestion.suggested_replacement}</p>
                    </div>
                    <p className="text-xs text-slate-600 italic">{suggestion.rationale}</p>
                  </div>
                ))}
                {results.terminology.overall_professionalism_score && (
                  <p className="text-sm">
                    Professional Score: <strong>{results.terminology.overall_professionalism_score}/100</strong>
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-3">
            <Button
              onClick={() => enhanceMutation.mutate('draft_progress_note')}
              disabled={enhanceMutation.isPending}
              size="sm"
            >
              {enhanceMutation.isPending ? 'Drafting...' : 'Generate Draft Note'}
            </Button>

            {results.draft_progress_note && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-sm whitespace-pre-wrap">{results.draft_progress_note.draft_note}</p>
                </div>
                {results.draft_progress_note.suggested_goals_alignment && (
                  <Alert>
                    <AlertDescription>
                      <strong>Goals Alignment:</strong> {results.draft_progress_note.suggested_goals_alignment}
                    </AlertDescription>
                  </Alert>
                )}
                {results.draft_progress_note.compliance_checklist && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Compliance Checklist:</p>
                    <ul className="text-xs space-y-1">
                      {results.draft_progress_note.compliance_checklist.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}