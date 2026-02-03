import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function MotivationAssessmentTool({ clientId, clientName }) {
  const [formData, setFormData] = useState({
    behavior_description: '',
    sensory_needs_score: 50,
    sensory_needs_notes: '',
    escape_avoidance_score: 50,
    escape_avoidance_notes: '',
    attention_score: 50,
    attention_notes: '',
    tangibles_score: 50,
    tangibles_notes: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const handleSliderChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value[0] }));
  };

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Behavior Assessment Data:
        
Behavior: ${formData.behavior_description}

Motivation Scores (0-100):
- Sensory Needs: ${formData.sensory_needs_score} - ${formData.sensory_needs_notes}
- Escape/Avoidance: ${formData.escape_avoidance_score} - ${formData.escape_avoidance_notes}
- Attention-Seeking: ${formData.attention_score} - ${formData.attention_notes}
- Tangibles: ${formData.tangibles_score} - ${formData.tangibles_notes}

Based on this Motivation Assessment Scale (MAS) assessment:

1. **Primary Motivation**: Which motivation(s) have the highest scores?
2. **Secondary Motivations**: Which other motivations are present?
3. **Behavioral Function**: What function does this behavior serve for the client?
4. **Intervention Strategies**: Specific, evidence-based strategies to address each motivation
5. **Environmental Modifications**: Changes to reduce opportunity or need for behavior
6. **Replacement Behaviors**: Teach alternative behaviors that serve same function
7. **Reinforcement Plan**: How to reinforce desired alternative behaviors
8. **Monitoring Plan**: How to track progress and effectiveness

Provide detailed, clinically sound recommendations tailored to behavior support practice.`,
        response_json_schema: {
          type: "object",
          properties: {
            primary_motivation: { type: "string" },
            secondary_motivations: { type: "array", items: { type: "string" } },
            behavioral_function: { type: "string" },
            intervention_strategies: { type: "array", items: { type: "string" } },
            environmental_modifications: { type: "array", items: { type: "string" } },
            replacement_behaviors: { type: "array", items: { type: "string" } },
            reinforcement_plan: { type: "string" },
            monitoring_plan: { type: "string" }
          }
        }
      });
      setRecommendations(response);
    } catch (error) {
      alert('Failed to generate recommendations: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAssessment = async () => {
    try {
      await base44.entities.MotivationAssessmentScale.create({
        client_id: clientId,
        client_name: clientName,
        assessment_date: new Date().toISOString().split('T')[0],
        ...formData,
        status: 'completed'
      });
      alert('Assessment saved successfully');
    } catch (error) {
      alert('Failed to save: ' + error.message);
    }
  };

  const scores = [
    { label: 'Sensory Needs', value: formData.sensory_needs_score, key: 'sensory_needs' },
    { label: 'Escape/Avoidance', value: formData.escape_avoidance_score, key: 'escape_avoidance' },
    { label: 'Attention', value: formData.attention_score, key: 'attention' },
    { label: 'Tangibles', value: formData.tangibles_score, key: 'tangibles' }
  ];

  const primaryMotivation = scores.reduce((prev, current) => 
    current.value > prev.value ? current : prev
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Motivation Assessment Scale (MAS)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Behavior Description</label>
            <Textarea
              placeholder="Describe the behavior being assessed in detail..."
              value={formData.behavior_description}
              onChange={(e) => setFormData(prev => ({ ...prev, behavior_description: e.target.value }))}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Motivation Scores */}
          <div className="space-y-4">
            {[
              { label: 'Sensory Needs', key: 'sensory_needs', desc: 'Does the behavior provide sensory input (e.g., sound, touch, movement)?' },
              { label: 'Escape/Avoidance', key: 'escape_avoidance', desc: 'Does the behavior help avoid/escape demands or situations?' },
              { label: 'Attention-Seeking', key: 'attention', desc: 'Does the behavior get attention from others?' },
              { label: 'Tangibles', key: 'tangibles', desc: 'Does the behavior access preferred items or activities?' }
            ].map(motivation => (
              <div key={motivation.key} className="p-3 border rounded bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{motivation.label}</h4>
                  <span className="text-lg font-bold text-teal-600">{formData[`${motivation.key}_score`]}</span>
                </div>
                <p className="text-xs text-slate-600 mb-2">{motivation.desc}</p>
                <Slider
                  value={[formData[`${motivation.key}_score`]]}
                  onValueChange={(value) => handleSliderChange(`${motivation.key}_score`, value)}
                  min={0}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <textarea
                  placeholder="Observations and evidence..."
                  value={formData[`${motivation.key}_notes`]}
                  onChange={(e) => setFormData(prev => ({ ...prev, [`${motivation.key}_notes`]: e.target.value }))}
                  className="w-full p-2 border rounded text-xs"
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* Primary Motivation Display */}
          <div className="p-3 bg-teal-50 rounded border border-teal-200">
            <p className="text-sm font-medium text-teal-900 mb-2">Primary Identified Motivation</p>
            <Badge className="bg-teal-600">{primaryMotivation.label}</Badge>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateRecommendations}
              disabled={!formData.behavior_description || isGenerating}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generate Recommendations
            </Button>
            <Button
              onClick={handleSaveAssessment}
              variant="outline"
              className="flex-1"
            >
              Save Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-900">AI-Generated Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900 mb-1">Behavioral Function</p>
              <p className="text-sm text-emerald-800">{recommendations.behavioral_function}</p>
            </div>

            {recommendations.intervention_strategies?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-2">Intervention Strategies</p>
                <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
                  {recommendations.intervention_strategies.slice(0, 4).map((strategy, idx) => (
                    <li key={idx}>{strategy}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.replacement_behaviors?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-2">Replacement Behaviors to Teach</p>
                <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
                  {recommendations.replacement_behaviors.slice(0, 3).map((behavior, idx) => (
                    <li key={idx}>{behavior}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.environmental_modifications?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-2">Environmental Modifications</p>
                <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
                  {recommendations.environmental_modifications.slice(0, 3).map((mod, idx) => (
                    <li key={idx}>{mod}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}