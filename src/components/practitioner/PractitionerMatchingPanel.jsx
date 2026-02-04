import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCheck, Star, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function PractitionerMatchingPanel() {
    const [clientId, setClientId] = useState('');
    const [recommendations, setRecommendations] = useState(null);

    const matchMutation = useMutation({
        mutationFn: (client_id) => base44.functions.invoke('recommendPractitionerMatch', { client_id }),
        onSuccess: (response) => {
            setRecommendations(response.data);
        }
    });

    const handleGenerateRecommendations = () => {
        if (!clientId) return;
        matchMutation.mutate(clientId);
    };

    const priorityColors = {
        highly_recommended: "bg-green-100 text-green-800 border-green-300",
        recommended: "bg-blue-100 text-blue-800 border-blue-300",
        suitable: "bg-yellow-100 text-yellow-800 border-yellow-300",
        consider_with_support: "bg-orange-100 text-orange-800 border-orange-300"
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Practitioner Matching</CardTitle>
                    <CardDescription>Intelligent resource allocation based on skills, experience, and client needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label>Client ID</Label>
                            <Input 
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Enter client ID"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button 
                                onClick={handleGenerateRecommendations}
                                disabled={!clientId || matchMutation.isPending}
                                className="gap-2"
                            >
                                <UserCheck className="h-4 w-4" />
                                {matchMutation.isPending ? 'Analyzing...' : 'Generate Recommendations'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {recommendations && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Matching Analysis: {recommendations.client_name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Overall Analysis</h4>
                                    <p className="text-sm text-gray-700">{recommendations.overall_analysis}</p>
                                </div>
                                
                                {recommendations.critical_considerations && recommendations.critical_considerations.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-600" />
                                            Critical Considerations
                                        </h4>
                                        <ul className="space-y-1">
                                            {recommendations.critical_considerations.map((consideration, idx) => (
                                                <li key={idx} className="text-sm flex items-start gap-2">
                                                    <span className="text-orange-600">!</span>
                                                    <span>{consideration}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold">Recommended Practitioners</h3>
                        {recommendations.recommendations.sort((a, b) => a.ranking - b.ranking).map((rec, idx) => (
                            <Card key={idx} className={`border-2 ${priorityColors[rec.recommended_priority]}`}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="text-base">#{rec.ranking}</Badge>
                                                <Badge className={priorityColors[rec.recommended_priority]}>
                                                    {rec.recommended_priority.replace(/_/g, ' ').toUpperCase()}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-xl">{rec.practitioner_name}</CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-600">{rec.suitability_score}</div>
                                            <div className="text-xs text-gray-500">Suitability Score</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Progress value={rec.suitability_score} className="h-2" />
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2">Match Rationale</h4>
                                        <p className="text-sm text-gray-700">{rec.match_rationale}</p>
                                    </div>

                                    {rec.key_strengths && rec.key_strengths.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                Key Strengths
                                            </h4>
                                            <ul className="space-y-1">
                                                {rec.key_strengths.map((strength, idx) => (
                                                    <li key={idx} className="text-sm flex items-start gap-2">
                                                        <span className="text-green-600">✓</span>
                                                        <span>{strength}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {rec.potential_concerns && rec.potential_concerns.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                Potential Concerns
                                            </h4>
                                            <ul className="space-y-1">
                                                {rec.potential_concerns.map((concern, idx) => (
                                                    <li key={idx} className="text-sm flex items-start gap-2">
                                                        <span className="text-yellow-600">!</span>
                                                        <span>{concern}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <Button size="sm">Assign Practitioner</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}