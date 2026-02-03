import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, FileText, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

export default function CaseNoteSummarizer() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['casenotes', selectedClient],
    queryFn: () => base44.entities.CaseNote.list('-created_date', 50),
    enabled: !!selectedClient,
  });

  const clientNotes = caseNotes.filter(n => n.client_id === selectedClient);

  const handleGenerateSummary = async () => {
    if (selectedNotes.length === 0) return;
    setIsGenerating(true);

    try {
      const notesToSummarize = clientNotes.filter(n => selectedNotes.includes(n.id));
      const client = clients.find(c => c.id === selectedClient);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation specialist for NDIS behaviour support services.

Summarize the following case notes for ${client?.full_name || 'the client'}.

Case Notes:
${notesToSummarize.map((note, i) => `
Note ${i + 1} (${note.created_date}):
Session Type: ${note.session_type || 'Not specified'}
Content: ${note.note_content || note.observations || 'No content'}
`).join('\n---\n')}

Provide a concise professional summary in markdown format with:

## Overall Progress
Brief overview of client's trajectory across these sessions

## Key Interventions Applied
- List main strategies and supports used
- Highlight any new interventions introduced

## Client Response & Outcomes
- Notable improvements or challenges
- Behaviour patterns observed
- Skill development progress

## Clinical Observations
- Significant changes or concerns
- Environmental factors
- Family/support network involvement

## Recommendations for Next Steps
- Suggested focus areas
- Potential BSP adjustments
- Follow-up priorities

Keep it professional, factual, and suitable for practitioner handover or management review.`,
      });

      setSummary(result);
    } catch (error) {
      setSummary('Error generating summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Case Note Summarizer
          </CardTitle>
          <CardDescription>
            Generate concise summaries from selected case notes to review client progress efficiently
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Client</Label>
            <Select value={selectedClient} onValueChange={(v) => {
              setSelectedClient(v);
              setSelectedNotes([]);
              setSummary('');
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} - {c.service_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClient && clientNotes.length > 0 && (
            <>
              <div>
                <Label className="mb-2 block">Select Case Notes to Summarize</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {clientNotes.map(note => (
                    <div key={note.id} className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded">
                      <Checkbox
                        id={note.id}
                        checked={selectedNotes.includes(note.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedNotes([...selectedNotes, note.id]);
                          } else {
                            setSelectedNotes(selectedNotes.filter(id => id !== note.id));
                          }
                        }}
                      />
                      <label htmlFor={note.id} className="text-sm cursor-pointer flex-1">
                        <div className="font-medium">{note.session_type || 'Session Note'}</div>
                        <div className="text-xs text-muted-foreground">
                          {note.created_date ? new Date(note.created_date).toLocaleDateString() : 'No date'}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedNotes.length} notes
                </p>
              </div>

              <Button
                onClick={handleGenerateSummary}
                disabled={selectedNotes.length === 0 || isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Summary ({selectedNotes.length} notes)
                  </>
                )}
              </Button>
            </>
          )}

          {selectedClient && clientNotes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No case notes found for this client</p>
            </div>
          )}
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Generated Summary
              </CardTitle>
              <CardDescription>
                Based on {selectedNotes.length} selected case notes
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}