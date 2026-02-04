import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PolicyChangeMonitor from "../components/compliance/PolicyChangeMonitor";
import AuditTrailGenerator from "../components/compliance/AuditTrailGenerator";
import PractitionerMatchingPanel from "../components/practitioner/PractitionerMatchingPanel";

export default function ComplianceAutomationPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Compliance Automation Suite</h1>
                    <p className="text-gray-600 mt-2">
                        AI-powered tools for policy monitoring, audit trail generation, and resource allocation
                    </p>
                </div>

                <Tabs defaultValue="policy" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="policy">Policy Monitor</TabsTrigger>
                        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                        <TabsTrigger value="matching">Practitioner Matching</TabsTrigger>
                    </TabsList>

                    <TabsContent value="policy">
                        <PolicyChangeMonitor />
                    </TabsContent>

                    <TabsContent value="audit">
                        <AuditTrailGenerator />
                    </TabsContent>

                    <TabsContent value="matching">
                        <PractitionerMatchingPanel />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}