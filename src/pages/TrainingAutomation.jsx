import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, AlertCircle, CheckCircle, Clock, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function TrainingAutomationPage() {
    const queryClient = useQueryClient();
    const [gapAnalysis, setGapAnalysis] = useState(null);

    const { data: trainingProgress = [] } = useQuery({
        queryKey: ['trainingProgress'],
        queryFn: () => base44.entities.TrainingProgress.list('-created_date')
    });

    const gapAnalysisMutation = useMutation({
        mutationFn: () => base44.functions.invoke('identifyTrainingGaps', {}),
        onSuccess: (response) => setGapAnalysis(response.data)
    });

    const generateModuleMutation = useMutation({
        mutationFn: (params) => base44.functions.invoke('generatePersonalizedTrainingModule', params),
        onSuccess: () => {
            queryClient.invalidateQueries(['trainingProgress']);
        }
    });

    const urgencyColors = {
        critical: "bg-red-100 text-red-800",
        high: "bg-orange-100 text-orange-800",
        medium: "bg-yellow-100 text-yellow-800",
        low: "bg-blue-100 text-blue-800"
    };

    const statusColors = {
        completed: "bg-green-100 text-green-800",
        in_progress: "bg-blue-100 text-blue-800",
        not_started: "bg-gray-100 text-gray-800"
    };

    // Group training progress by status
    const overdueTraining = trainingProgress.filter(t => 
        t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()
    );
    const inProgressTraining = trainingProgress.filter(t => t.status === 'in_progress');
    const completedTraining = trainingProgress.filter(t => t.status === 'completed');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Automated Compliance Training</h1>
                <p className="text-gray-600">AI-powered gap identification and personalized training generation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Total Training Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{trainingProgress.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-red-700">Overdue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{overdueTraining.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-blue-700">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{inProgressTraining.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-700">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{completedTraining.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="gaps" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="gaps">Knowledge Gaps</TabsTrigger>
                    <TabsTrigger value="tracking">Training Tracking</TabsTrigger>
                </TabsList>

                <TabsContent value="gaps" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identify Knowledge Gaps</CardTitle>
                            <CardDescription>AI analysis based on performance, incidents, and compliance audits</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={() => gapAnalysisMutation.mutate()}
                                disabled={gapAnalysisMutation.isPending}
                                className="gap-2"
                            >
                                <Brain className="h-4 w-4" />
                                {gapAnalysisMutation.isPending ? 'Analyzing...' : 'Run Gap Analysis'}
                            </Button>
                        </CardContent>
                    </Card>

                    {gapAnalysis && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Gap Analysis Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{gapAnalysis.gap_analysis.overall_gap_summary}</p>
                                </CardContent>
                            </Card>

                            {gapAnalysis.gap_analysis.systemic_gaps && gapAnalysis.gap_analysis.systemic_gaps.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-orange-600" />
                                            Systemic Gaps
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {gapAnalysis.gap_analysis.systemic_gaps.map((gap, idx) => (
                                                <div key={idx} className="p-3 border-l-4 border-orange-500 rounded">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">{gap.gap_area}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={urgencyColors[gap.severity?.toLowerCase()] || urgencyColors.medium}>
                                                                {gap.severity}
                                                            </Badge>
                                                            <Badge variant="outline">{gap.affected_practitioners_count} practitioners</Badge>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{gap.recommended_training}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Practitioner-Specific Gaps</h3>
                                {gapAnalysis.gap_analysis.practitioner_specific_gaps?.map((practitioner, idx) => (
                                    <Card key={idx}>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{practitioner.practitioner_name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold mb-2">Identified Gaps:</h4>
                                                    <div className="space-y-2">
                                                        {practitioner.identified_gaps?.map((gap, gidx) => (
                                                            <div key={gidx} className="p-2 border rounded">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm font-medium">{gap.gap_area}</span>
                                                                    <Badge className={urgencyColors[gap.urgency?.toLowerCase()] || urgencyColors.medium}>
                                                                        {gap.urgency}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-600">{gap.evidence}</p>
                                                                <p className="text-xs text-red-600 mt-1">Risk: {gap.compliance_risk}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">Recommended Training Modules:</h4>
                                                    <div className="space-y-2">
                                                        {practitioner.recommended_modules?.map((module, midx) => (
                                                            <div key={midx} className="flex items-center justify-between p-2 border rounded">
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium">{module.module_title}</p>
                                                                    <p className="text-xs text-gray-600">{module.module_focus}</p>
                                                                    <p className="text-xs text-gray-500">Duration: {module.estimated_duration}</p>
                                                                </div>
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => generateModuleMutation.mutate({
                                                                        practitioner_id: practitioner.practitioner_id,
                                                                        gap_area: module.module_focus,
                                                                        module_focus: module.module_title
                                                                    })}
                                                                    disabled={generateModuleMutation.isPending}
                                                                >
                                                                    {generateModuleMutation.isPending ? 'Generating...' : 'Generate & Assign'}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="tracking" className="space-y-4">
                    {overdueTraining.length > 0 && (
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-700">
                                    <AlertCircle className="h-5 w-5" />
                                    Overdue Training
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {overdueTraining.map((training, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 border border-red-200 rounded">
                                            <div>
                                                <p className="font-medium">{training.practitioner_name}</p>
                                                <p className="text-sm text-gray-600">{training.module_name}</p>
                                                <p className="text-xs text-red-600">Due: {new Date(training.due_date).toLocaleDateString()}</p>
                                            </div>
                                            <Badge className="bg-red-100 text-red-800">OVERDUE</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>All Training Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {trainingProgress.map((training, idx) => (
                                    <div key={idx} className="p-3 border rounded">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium">{training.practitioner_name}</p>
                                                <p className="text-sm text-gray-700">{training.module_name}</p>
                                                {training.due_date && (
                                                    <p className="text-xs text-gray-500">Due: {new Date(training.due_date).toLocaleDateString()}</p>
                                                )}
                                            </div>
                                            <Badge className={statusColors[training.status] || statusColors.not_started}>
                                                {training.status === 'not_started' && <Clock className="h-3 w-3 mr-1 inline" />}
                                                {training.status === 'in_progress' && <BookOpen className="h-3 w-3 mr-1 inline" />}
                                                {training.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1 inline" />}
                                                {training.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        {training.quiz_score !== null && training.quiz_score !== undefined && (
                                            <div>
                                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                    <span>Quiz Score</span>
                                                    <span>{training.quiz_score}%</span>
                                                </div>
                                                <Progress value={training.quiz_score} className="h-1" />
                                            </div>
                                        )}
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