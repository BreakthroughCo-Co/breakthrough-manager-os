import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, CheckCircle2, AlertTriangle, FileText, BookOpen } from 'lucide-react';

/**
 * AI-Assisted BSP Authoring
 * Structured prompts grounded in NDIS rules with best-practice enforcement
 */
export default function BSPAuthoring({ clientId, fbaId, onSave }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    participant_profile: '',
    behaviour_summary: '',
    functional_analysis: '',
    environmental_strategies: '',
    skill_building_strategies: '',
    reactive_strategies: '',
    restrictive_practices: '',
    monitoring_evaluation: '',
    implementation_support: '',
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: fba } = useQuery({
    queryKey: ['fba', fbaId],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.filter({ id: fbaId }).then(r => r[0]),
    enabled: !!fbaId,
  });

  const sections = [
    { 
      key: 'profile', 
      label: 'Participant Profile',
      icon: FileText,
      prompt: 'Write a participant profile section for this BSP that includes strengths, interests, communication style, and contextual factors. Use person-centered, strengths-based language.',
    },
    { 
      key: 'behaviour_summary', 
      label: 'Behaviour Summary',
      icon: BookOpen,
      prompt: 'Write a behaviour summary describing the target behaviours, their frequency, intensity, and impact. Use objective, non-judgmental language aligned with PBS principles.',
    },
    { 
      key: 'functional_analysis', 
      label: 'Functional Analysis',
      icon: Sparkles,
      prompt: 'Write a functional analysis section explaining the function(s) of the behaviour based on the FBA. Link antecedents, setting events, and consequences. Ensure evidence-based conclusions.',
    },
    { 
      key: 'environmental_strategies', 
      label: 'Environmental Strategies',
      icon: CheckCircle2,
      prompt: 'Write environmental and proactive strategies to reduce the likelihood of the behaviour. Focus on antecedent modifications, setting event changes, and preventive supports. Ensure strategies are practical and NDIS-compliant.',
    },
    { 
      key: 'skill_building_strategies', 
      label: 'Skill Building',
      icon: CheckCircle2,
      prompt: 'Write skill building and replacement behaviour strategies. Include communication skills, self-regulation, and functionally equivalent alternatives. Ensure teaching methods are evidence-based.',
    },
    { 
      key: 'reactive_strategies', 
      label: 'Reactive Strategies',
      icon: AlertTriangle,
      prompt: 'Write reactive strategies for when the behaviour occurs. Focus on safety, de-escalation, and minimizing reinforcement. Ensure compliance with restrictive practice regulations if applicable.',
    },
    { 
      key: 'monitoring_evaluation', 
      label: 'Monitoring & Evaluation',
      icon: CheckCircle2,
      prompt: 'Write a monitoring and evaluation plan including data collection methods, review frequency, and success criteria. Align with NDIS quality indicators.',
    },
    { 
      key: 'implementation_support', 
      label: 'Implementation Support',
      icon: CheckCircle2,
      prompt: 'Write an implementation support plan covering training requirements, role clarification, and ongoing support mechanisms. Ensure practical and sustainable.',
    },
  ];

  const generateSection = async (section) => {
    setGenerating(true);
    try {
      const contextData = {
        client: client ? {
          name: client.full_name,
          age: client.date_of_birth,
          service_type: client.service_type,
        } : null,
        fba: fba ? {
          target_behaviours: fba.target_behaviours,
          hypothesised_function: fba.hypothesised_function,
          antecedents: fba.antecedents,
          consequences: fba.consequences,
          setting_events: fba.setting_events,
          recommendations: fba.recommendations,
        } : null,
        existing_content: formData[section.key],
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an experienced behaviour support practitioner writing a section for a Behaviour Support Plan under NDIS Practice Standards.

Context:
${JSON.stringify(contextData, null, 2)}

Task: ${section.prompt}

Requirements:
- Use person-centered, strengths-based language
- Ensure evidence-based approaches
- Comply with NDIS Positive Behaviour Support Capability Framework
- Avoid jargon; write for family members and support workers
- Be specific and actionable
- If restrictive practices are mentioned, ensure proper safeguards and authorization language
- Link strategies to the functional analysis

Write a professional, high-quality section (200-400 words) suitable for a published BSP.`,
      });

      setFormData(prev => ({
        ...prev,
        [section.key]: response,
      }));
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const refineSection = async (section) => {
    setGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are reviewing and refining a section of a Behaviour Support Plan for NDIS compliance and best practice.

Current content:
${formData[section.key]}

Task: Refine this content to ensure:
1. Person-centered, non-pathologizing language
2. Evidence-based strategies referenced where appropriate
3. NDIS Positive Behaviour Support Capability Framework compliance
4. Clear, actionable recommendations
5. Proper safeguards if restrictive practices mentioned
6. Readability for families and support workers

Provide the refined version without explanations.`,
      });

      setFormData(prev => ({
        ...prev,
        [section.key]: response,
      }));
    } catch (error) {
      console.error('Refinement failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const activeTab = sections.find(s => s.key === activeSection);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Assisted BSP Authoring
            </CardTitle>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              NDIS Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              AI assists with drafting BSP sections using evidence-based frameworks and NDIS standards. 
              Always review, edit, and validate generated content with clinical judgment.
            </AlertDescription>
          </Alert>

          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="grid grid-cols-4 mb-4">
              {sections.slice(0, 4).map(section => {
                const Icon = section.icon;
                return (
                  <TabsTrigger key={section.key} value={section.key} className="text-xs">
                    <Icon className="w-3 h-3 mr-1" />
                    {section.label.split(' ')[0]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsList className="grid grid-cols-4 mb-4">
              {sections.slice(4).map(section => {
                const Icon = section.icon;
                return (
                  <TabsTrigger key={section.key} value={section.key} className="text-xs">
                    <Icon className="w-3 h-3 mr-1" />
                    {section.label.split(' ')[0]}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {sections.map(section => (
              <TabsContent key={section.key} value={section.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{section.label}</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateSection(section)}
                      disabled={generating}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {formData[section.key] ? 'Regenerate' : 'Generate'}
                    </Button>
                    {formData[section.key] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refineSection(section)}
                        disabled={generating}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Refine
                      </Button>
                    )}
                  </div>
                </div>

                <Textarea
                  value={formData[section.key]}
                  onChange={(e) => setFormData(prev => ({ ...prev, [section.key]: e.target.value }))}
                  placeholder={`Click "Generate" to create AI-assisted content for ${section.label}...`}
                  className="min-h-[300px] font-sans"
                />

                <p className="text-xs text-muted-foreground">
                  {section.prompt}
                </p>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline">Save Draft</Button>
            <Button onClick={() => onSave?.(formData)}>
              Complete BSP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}