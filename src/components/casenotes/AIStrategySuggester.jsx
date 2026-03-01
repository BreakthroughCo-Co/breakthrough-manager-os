import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Target, Brain, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AIStrategySuggester({ clientId, sessionType, currentDraft, onApplyGoal, onApplyStrategy }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [goalsExpanded, setGoalsExpanded] = useState(true);
  const [strategiesExpanded, setStrategiesExpanded] = useState(true);

  const handleFetch = async () => {
    if (!clientId) return;
    setLoading(true);
    setSuggestions(null);
    const res = await base44.functions.invoke('suggestCaseNoteStrategies', {
      client_id: clientId, session_type: sessionType, current_draft: currentDraft
    });
    setSuggestions(res.data?.suggestions || null);
    setLoading(false);
  };

  return (
    <div className="border border-purple-200 rounded-lg bg-purple-50/50">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">AI Strategy Suggester</span>
          <span className="text-xs text-purple-500">Based on FBA, BSP & history</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleFetch} disabled={!clientId || loading}
          className="border-purple-300 text-purple-700 hover:bg-purple-100">
          {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analysing...</> : 'Suggest Goals & Strategies'}
        </Button>
      </div>

      {suggestions && (
        <div className="px-3 pb-3 space-y-3">
          {/* Progress Assessment */}
          {suggestions.progress_assessment && (
            <div className="p-2 bg-white border border-purple-200 rounded text-xs text-slate-700">
              <span className="font-medium text-purple-700">Progress Assessment: </span>{suggestions.progress_assessment}
            </div>
          )}

          {/* Compliance Flags */}
          {suggestions.compliance_flags?.length > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Compliance Flags</span>
              </div>
              {suggestions.compliance_flags.map((flag, i) => (
                <p key={i} className="text-xs text-amber-800 ml-4">• {flag}</p>
              ))}
            </div>
          )}

          {/* Suggested Goals */}
          {suggestions.suggested_goals?.length > 0 && (
            <div>
              <button className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1" onClick={() => setGoalsExpanded(!goalsExpanded)}>
                {goalsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Target className="w-3 h-3 text-teal-600" />
                NDIS Goals ({suggestions.suggested_goals.length})
              </button>
              {goalsExpanded && (
                <div className="space-y-1.5">
                  {suggestions.suggested_goals.map((g, i) => (
                    <div key={i} className="p-2 bg-white border border-teal-100 rounded text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{g.goal_text}</p>
                          <div className="flex gap-2 mt-0.5">
                            <Badge className="bg-teal-100 text-teal-700 text-xs">{g.ndis_domain?.replace(/_/g, ' ')}</Badge>
                          </div>
                          <p className="text-slate-500 mt-0.5">{g.rationale}</p>
                        </div>
                        {onApplyGoal && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-teal-700 px-2 shrink-0" onClick={() => onApplyGoal(g.goal_text)}>
                            Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggested Strategies */}
          {suggestions.suggested_strategies?.length > 0 && (
            <div>
              <button className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1" onClick={() => setStrategiesExpanded(!strategiesExpanded)}>
                {strategiesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Brain className="w-3 h-3 text-purple-600" />
                Behavioural Strategies ({suggestions.suggested_strategies.length})
              </button>
              {strategiesExpanded && (
                <div className="space-y-1.5">
                  {suggestions.suggested_strategies.map((s, i) => (
                    <div key={i} className="p-2 bg-white border border-purple-100 rounded text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{s.strategy}</p>
                          <div className="flex gap-2 mt-0.5">
                            <Badge className="bg-purple-100 text-purple-700 text-xs">{s.strategy_type}</Badge>
                          </div>
                          <p className="text-slate-500 mt-0.5">{s.evidence_basis}</p>
                        </div>
                        {onApplyStrategy && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-700 px-2 shrink-0" onClick={() => onApplyStrategy(s.strategy)}>
                            Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}