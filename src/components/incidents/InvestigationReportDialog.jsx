import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function InvestigationReportDialog({ incident, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportDraft, setReportDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('draftInvestigationReport', {
        incident_id: incident.id,
      });
      setReportDraft(result.data.report_draft);
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportDraft);
    alert('Report copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Investigation Report Assistant</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {incident.severity === 'high' || incident.severity === 'critical' ? (
            <>
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  High-severity incident detected. Use this AI assistant to draft a comprehensive investigation report.
                </AlertDescription>
              </Alert>

              {!reportDraft ? (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? 'Generating Report...' : 'Generate Investigation Report'}
                </Button>
              ) : (
                <>
                  <div className="prose prose-sm max-w-none p-4 bg-slate-50 rounded-lg border max-h-96 overflow-y-auto">
                    <ReactMarkdown>{reportDraft}</ReactMarkdown>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopy} variant="outline" className="flex-1">
                      Copy Report
                    </Button>
                    <Button onClick={handleGenerate} variant="outline" disabled={isGenerating}>
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    value={reportDraft}
                    onChange={(e) => setReportDraft(e.target.value)}
                    rows={8}
                    placeholder="Edit the generated report here..."
                  />
                </>
              )}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Investigation reports are recommended for high or critical severity incidents only.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}