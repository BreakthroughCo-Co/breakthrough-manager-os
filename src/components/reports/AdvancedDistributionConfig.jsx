import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AdvancedDistributionConfig() {
  const [selectedRuleTemplate, setSelectedRuleTemplate] = useState(null);

  const templates = [
    {
      name: 'Compliance Alert',
      description: 'Immediate distribution if compliance score < 85',
      triggers: {
        compliance_score_threshold: 85,
        distribution_urgency: 'immediate'
      },
      recipients: ['compliance_officer', 'admin'],
      icon: '⚠️'
    },
    {
      name: 'Clinical Review',
      description: 'Weekly digest of clinical effectiveness reports',
      triggers: {
        report_type: 'clinical_effectiveness',
        frequency: 'weekly_summary'
      },
      recipients: ['clinical_lead'],
      icon: '📋'
    },
    {
      name: 'Financial Overview',
      description: 'Monthly financial operations to finance manager',
      triggers: {
        report_type: 'financial_operations',
        frequency: 'monthly_digest'
      },
      recipients: ['finance_manager'],
      icon: '💰'
    },
    {
      name: 'Critical Incident Report',
      description: 'Immediate alert if critical incident rate > 10%',
      triggers: {
        critical_incident_threshold: 0.1,
        distribution_urgency: 'immediate'
      },
      recipients: ['admin', 'clinical_lead'],
      icon: '🚨'
    }
  ];

  return (
    <Tabs defaultValue="templates" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="templates">Rule Templates</TabsTrigger>
        <TabsTrigger value="advanced">Custom Rules</TabsTrigger>
      </TabsList>

      {/* Templates */}
      <TabsContent value="templates" className="space-y-4 mt-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-3 w-3 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            Pre-configured templates reduce setup time and ensure consistency. Customize thresholds as needed.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-3">
          {templates.map((template, idx) => (
            <Card
              key={idx}
              className={`cursor-pointer transition-all ${
                selectedRuleTemplate === idx ? 'ring-2 ring-teal-600 border-teal-600' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedRuleTemplate(selectedRuleTemplate === idx ? null : idx)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-xl">{template.icon}</span>
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                  </div>
                  {selectedRuleTemplate === idx && (
                    <Badge className="bg-teal-600">Selected</Badge>
                  )}
                </div>
              </CardHeader>

              {selectedRuleTemplate === idx && (
                <CardContent className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-900">Recipients</p>
                    <div className="flex flex-wrap gap-1">
                      {template.recipients.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-900">Trigger Conditions</p>
                    <div className="text-xs text-slate-600 space-y-1">
                      {Object.entries(template.triggers).map(([key, value]) => (
                        <p key={key}>
                          <span className="font-semibold">{key.replace(/_/g, ' ')}:</span> {String(value)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700">
                    Use This Template
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Custom Rules */}
      <TabsContent value="advanced" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Content-Based Distribution Rules</CardTitle>
            <CardDescription className="text-xs">
              Define rules that analyze report content before distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-2">Compliance Score Threshold</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="85"
                    className="flex-1"
                  />
                  <input
                    type="number"
                    defaultValue="85"
                    min="0"
                    max="100"
                    className="w-12 text-xs p-1 border rounded"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">Distribute only if score falls below this value</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-2">Critical Incident Rate Threshold</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    defaultValue="0.1"
                    className="flex-1"
                  />
                  <input
                    type="number"
                    defaultValue="10"
                    min="0"
                    max="100"
                    className="w-12 text-xs p-1 border rounded"
                  />
                  <span className="text-xs text-slate-600">%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-2">Distribute If Risk Trend</label>
                <select className="w-full text-xs p-2 border rounded">
                  <option>Any declining trend</option>
                  <option>High or critical risk</option>
                  <option>Compliance breaches found</option>
                </select>
              </div>
            </div>

            <Button className="w-full bg-teal-600 hover:bg-teal-700">Save Custom Rule</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Role-Specific Summaries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-slate-600 mb-3">AI generates tailored summaries for each recipient role</p>
            {['clinical_lead', 'finance_manager', 'compliance_officer', 'admin'].map(role => (
              <label key={role} className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-3 h-3" />
                <span className="text-xs font-semibold text-slate-900 capitalize">{role.replace(/_/g, ' ')}</span>
              </label>
            ))}
            <Button size="sm" className="w-full mt-3 bg-teal-600 hover:bg-teal-700">
              Enable Role-Specific Summaries
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}