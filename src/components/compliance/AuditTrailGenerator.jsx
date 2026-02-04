import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, CheckCircle, AlertTriangle, Clock } from "lucide-react";

export default function AuditTrailGenerator() {
    const [entityType, setEntityType] = useState('Client');
    const [entityId, setEntityId] = useState('');
    const [auditPurpose, setAuditPurpose] = useState('');
    const [auditResult, setAuditResult] = useState(null);

    const generateMutation = useMutation({
        mutationFn: (params) => base44.functions.invoke('generateAuditTrail', params),
        onSuccess: (response) => {
            setAuditResult(response.data);
        }
    });

    const handleGenerate = () => {
        if (!entityId) return;
        generateMutation.mutate({ entity_type: entityType, entity_id: entityId, audit_purpose: auditPurpose });
    };

    const renderComplianceStatus = (status) => {
        if (!status) return null;
        
        return (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold mb-2">Overall Rating</h4>
                    <Badge className="text-lg">{status.overall_rating}</Badge>
                </div>
                
                {status.compliant_areas && status.compliant_areas.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Compliant Areas
                        </h4>
                        <ul className="space-y-1">
                            {status.compliant_areas.map((area, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{area}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {status.attention_required && status.attention_required.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Attention Required
                        </h4>
                        <ul className="space-y-1">
                            {status.attention_required.map((area, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                    <span className="text-yellow-600">!</span>
                                    <span>{area}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {status.non_compliant && status.non_compliant.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Non-Compliant
                        </h4>
                        <ul className="space-y-1">
                            {status.non_compliant.map((area, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                    <span className="text-red-600">✗</span>
                                    <span>{area}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Generate Audit Trail</CardTitle>
                    <CardDescription>Compile comprehensive audit documentation for compliance verification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Entity Type</Label>
                            <Select value={entityType} onValueChange={setEntityType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Client">Client</SelectItem>
                                    <SelectItem value="ComplianceItem">Compliance Item</SelectItem>
                                    <SelectItem value="Practitioner">Practitioner</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Entity ID</Label>
                            <Input 
                                value={entityId}
                                onChange={(e) => setEntityId(e.target.value)}
                                placeholder="Enter entity ID"
                            />
                        </div>
                        <div>
                            <Label>Audit Purpose (Optional)</Label>
                            <Input 
                                value={auditPurpose}
                                onChange={(e) => setAuditPurpose(e.target.value)}
                                placeholder="e.g., Annual review"
                            />
                        </div>
                    </div>
                    <Button 
                        onClick={handleGenerate}
                        disabled={!entityId || generateMutation.isPending}
                        className="gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        {generateMutation.isPending ? 'Generating...' : 'Generate Audit Trail'}
                    </Button>
                </CardContent>
            </Card>

            {auditResult && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Audit Trail: {auditResult.entity_name}</CardTitle>
                                <CardDescription>
                                    Generated {new Date(auditResult.generated_date).toLocaleString()}
                                </CardDescription>
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="summary" className="space-y-4">
                            <TabsList>
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                            </TabsList>

                            <TabsContent value="summary" className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Executive Summary</h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {auditResult.audit_trail.executive_summary}
                                    </p>
                                </div>
                                {auditResult.audit_trail.recommendations && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Recommendations</h3>
                                        <ul className="space-y-2">
                                            {auditResult.audit_trail.recommendations.map((rec, idx) => (
                                                <li key={idx} className="text-sm flex items-start gap-2">
                                                    <span className="text-blue-600">→</span>
                                                    <span>{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="compliance">
                                {renderComplianceStatus(auditResult.audit_trail.compliance_status)}
                            </TabsContent>

                            <TabsContent value="timeline">
                                <div className="space-y-3">
                                    {auditResult.audit_trail.key_events_timeline?.map((event, idx) => (
                                        <div key={idx} className="border-l-2 border-blue-500 pl-4 py-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline">{event.date}</Badge>
                                                <Badge>{event.significance}</Badge>
                                            </div>
                                            <p className="text-sm">{event.event}</p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="evidence">
                                <div className="space-y-4">
                                    {Object.entries(auditResult.audit_trail.evidence_summary || {}).map(([category, items]) => (
                                        <div key={category}>
                                            <h4 className="font-semibold mb-2 capitalize">{category}</h4>
                                            <ul className="space-y-1">
                                                {items.map((item, idx) => (
                                                    <li key={idx} className="text-sm flex items-start gap-2">
                                                        <FileText className="h-3 w-3 mt-0.5 text-gray-400" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="checklist">
                                <div className="space-y-2">
                                    {auditResult.audit_trail.audit_checklist?.map((item, idx) => (
                                        <Card key={idx}>
                                            <CardContent className="py-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{item.item}</p>
                                                        {item.notes && (
                                                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                                                        )}
                                                    </div>
                                                    <Badge 
                                                        className={
                                                            item.status === 'verified' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }
                                                    >
                                                        {item.status}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}