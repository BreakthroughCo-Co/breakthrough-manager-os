import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, Target, MessageSquare, Shield, TrendingUp, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function PersonalizedSupportPlanPanel({ supportPlan, isGenerating, onGenerate }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isGenerating) {
    return (
      <Card className="border-indigo-200">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">AI is generating personalized support plan...</p>
        </CardContent>
      </Card>
    );
  }

  if (!supportPlan) {
    return (
      <Card className="border-indigo-200">
        <CardContent className="py-12 text-center">
          <Lightbulb className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">Generate an AI-powered personalized support plan</p>
          <Button onClick={onGenerate} className="bg-indigo-600 hover:bg-indigo-700">
            <Lightbulb className="w-4 h-4 mr-2" />
            Generate Support Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = supportPlan.recommendations || supportPlan.support_plan || {};

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      {plan.executive_summary && (
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed">{plan.executive_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Evidence Summary */}
      {plan.evidence_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Evidence-Based Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.evidence_summary.progress_patterns && (
              <div>
                <p className="text-xs font-semibold text-slate-700">Progress Patterns:</p>
                <p className="text-sm text-slate-600">{plan.evidence_summary.progress_patterns}</p>
              </div>
            )}
            {plan.evidence_summary.incident_trends && (
              <div>
                <p className="text-xs font-semibold text-slate-700">Incident Trends:</p>
                <p className="text-sm text-slate-600">{plan.evidence_summary.incident_trends}</p>
              </div>
            )}
            {plan.evidence_summary.abc_insights && (
              <div>
                <p className="text-xs font-semibold text-slate-700">ABC Insights:</p>
                <p className="text-sm text-slate-600">{plan.evidence_summary.abc_insights}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Behavioral Strategies */}
      {plan.behavioral_strategies && plan.behavioral_strategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Behavioral Support Strategies
            </CardTitle>
            <CardDescription>Evidence-based approaches tailored to this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.behavioral_strategies.map((strategy, idx) => (
              <div key={idx} className="border-l-4 border-purple-300 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{strategy.strategy}</h4>
                    {strategy.description && <p className="text-sm text-slate-600 mb-2">{strategy.description}</p>}
                    {strategy.evidence_base && (
                     <div className="text-xs bg-purple-50 rounded px-2 py-1 mb-2">
                       <span className="font-medium text-purple-900">Evidence Base:</span>
                       <span className="text-purple-700"> {strategy.evidence_base}</span>
                     </div>
                    )}
                    {strategy.implementation && (
                     <div className="text-xs text-slate-500">
                       <span className="font-medium">Implementation:</span> {strategy.implementation}
                     </div>
                    )}
                    {strategy.expected_outcomes && (
                     <div className="text-xs text-slate-500 mt-1">
                       <span className="font-medium">Expected Outcomes:</span> {strategy.expected_outcomes}
                     </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`${strategy.strategy}\n\n${strategy.description}\n\nImplementation: ${strategy.implementation_steps}`)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Specific Interventions */}
      {plan.interventions && plan.interventions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Specific Interventions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.interventions.map((intervention, idx) => (
              <div key={idx} className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-900">{intervention.intervention}</span>
                      {intervention.priority && (
                        <Badge variant="outline" className="text-xs">
                          {intervention.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-blue-800 mb-2">{intervention.rationale}</p>
                    {intervention.expected_outcome && (
                      <p className="text-xs text-blue-700">
                        <span className="font-medium">Expected Outcome:</span> {intervention.expected_outcome}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`${intervention.intervention}\n\nRationale: ${intervention.rationale}\n\nExpected Outcome: ${intervention.expected_outcome}`)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Communication Approaches */}
      {plan.communication_approaches && plan.communication_approaches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Communication Approaches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.communication_approaches.map((approach, idx) => (
              <div key={idx} className="border border-green-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">{approach.approach}</h4>
                    <p className="text-sm text-slate-600">{approach.description}</p>
                    {approach.examples && (
                      <div className="mt-2 text-xs text-slate-500">
                        <span className="font-medium">Examples:</span> {approach.examples}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`${approach.approach}\n\n${approach.description}\n\nExamples: ${approach.examples}`)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Mitigation */}
      {plan.risk_mitigation && plan.risk_mitigation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Risk Mitigation Strategies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.risk_mitigation.map((strategy, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 mb-1">{strategy.risk}</h4>
                    <p className="text-sm text-red-800 mb-2">
                      <span className="font-medium">Mitigation:</span> {strategy.mitigation}
                    </p>
                    {strategy.monitoring && (
                      <p className="text-xs text-red-700">
                        <span className="font-medium">Monitoring:</span> {strategy.monitoring}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`Risk: ${strategy.risk}\n\nMitigation: ${strategy.mitigation}\n\nMonitoring: ${strategy.monitoring}`)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skill Building Priorities */}
      {plan.skill_building && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Skill Building Priorities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{plan.skill_building}</p>
          </CardContent>
        </Card>
      )}

      {/* Progress Monitoring */}
      {plan.progress_monitoring && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progress Monitoring Framework</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.progress_monitoring.key_metrics && (
              <div>
                <p className="text-xs font-semibold">Key Metrics:</p>
                <ul className="list-disc list-inside text-sm text-slate-600">
                  {plan.progress_monitoring.key_metrics.map((metric, idx) => (
                    <li key={idx}>{metric}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.progress_monitoring.review_frequency && (
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Review Frequency:</span> {plan.progress_monitoring.review_frequency}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Crisis Response */}
      {plan.crisis_response_plan && (
        <Card className="border-2 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Shield className="w-5 h-5" />
              Crisis Response Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.crisis_response_plan.warning_signs && (
              <div>
                <p className="text-sm font-semibold text-red-900">Warning Signs:</p>
                <ul className="list-disc list-inside text-sm text-red-800">
                  {plan.crisis_response_plan.warning_signs.map((sign, idx) => (
                    <li key={idx}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.crisis_response_plan.de_escalation_steps && (
              <div>
                <p className="text-sm font-semibold text-red-900">De-escalation Steps:</p>
                <ol className="list-decimal list-inside text-sm text-red-800">
                  {plan.crisis_response_plan.de_escalation_steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NDIS Alignment */}
      {plan.ndis_alignment && Array.isArray(plan.ndis_alignment) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">NDIS Plan Alignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.ndis_alignment.map((item, idx) => (
              <div key={idx} className="border-l-2 border-teal-300 pl-3">
                <p className="text-sm font-semibold text-slate-900">{item.ndis_goal}</p>
                <p className="text-sm text-slate-600">{item.how_plan_supports}</p>
                {item.funding_category && (
                  <Badge variant="outline" className="mt-1 text-xs">{item.funding_category}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={onGenerate} variant="outline">
          Regenerate Plan
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const fullPlanText = `PERSONALIZED SUPPORT PLAN\n\n${plan.overview || ''}\n\n${JSON.stringify(plan, null, 2)}`;
            copyToClipboard(fullPlanText);
          }}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Full Plan
        </Button>
      </div>
    </div>
  );
}