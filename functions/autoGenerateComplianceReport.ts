import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch compliance data
        const [complianceItems, incidents, auditReports, breaches] = await Promise.all([
            base44.entities.ComplianceItem.list('-due_date', 200),
            base44.entities.Incident.list('-incident_date', 100),
            base44.entities.ComplianceAuditReport.list('-audit_date', 50),
            base44.entities.ComplianceBreach.list('-breach_date', 50)
        ]);

        // Run AI gap analysis
        const gapAnalysis = await base44.functions.invoke('detectComplianceGaps', {});

        // Generate comprehensive compliance summary
        const reportContent = await base44.integrations.Core.InvokeLLM({
            prompt: `Generate a comprehensive monthly compliance report for an NDIS provider.

Compliance Items (${complianceItems.length}):
${JSON.stringify(complianceItems.slice(0, 50), null, 2)}

Recent Incidents (${incidents.length}):
${JSON.stringify(incidents.slice(0, 30), null, 2)}

Recent Audit Reports (${auditReports.length}):
${JSON.stringify(auditReports.slice(0, 20), null, 2)}

Compliance Breaches (${breaches.length}):
${JSON.stringify(breaches, null, 2)}

AI Gap Analysis:
${JSON.stringify(gapAnalysis.data, null, 2)}

Generate a structured report including:
1. Executive Summary (key findings, overall compliance status)
2. Critical Issues (high-priority items requiring immediate attention)
3. Compliance Status by Category (breakdown of NDIS Registration, Quality & Safeguards, etc.)
4. Incident Analysis (patterns, trends, risk areas)
5. Gap Analysis Summary (from AI analysis)
6. Action Items (prioritized recommendations)
7. Positive Progress (improvements and achievements)
8. Next Review Date and Focus Areas

Make it professional, actionable, and NDIS-focused.`,
            response_json_schema: {
                type: "object",
                properties: {
                    report_title: { type: "string" },
                    report_date: { type: "string" },
                    executive_summary: { type: "string" },
                    overall_compliance_score: { type: "number" },
                    critical_issues: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                issue: { type: "string" },
                                severity: { type: "string" },
                                action_required: { type: "string" },
                                deadline: { type: "string" }
                            }
                        }
                    },
                    compliance_by_category: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                status: { type: "string" },
                                items_compliant: { type: "number" },
                                items_requiring_attention: { type: "number" },
                                notes: { type: "string" }
                            }
                        }
                    },
                    incident_analysis: {
                        type: "object",
                        properties: {
                            total_incidents: { type: "number" },
                            critical_incidents: { type: "number" },
                            trends: { type: "array", items: { type: "string" } },
                            risk_areas: { type: "array", items: { type: "string" } }
                        }
                    },
                    gap_analysis_summary: { type: "string" },
                    action_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                priority: { type: "string" },
                                action: { type: "string" },
                                responsible: { type: "string" },
                                timeline: { type: "string" }
                            }
                        }
                    },
                    positive_progress: { type: "array", items: { type: "string" } },
                    next_review_date: { type: "string" },
                    next_focus_areas: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Generate PDF
        const doc = new jsPDF();
        let yPos = 20;

        // Title
        doc.setFontSize(18);
        doc.text(reportContent.report_title || 'Monthly Compliance Report', 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.text(reportContent.report_date || new Date().toLocaleDateString(), 20, yPos);
        yPos += 15;

        // Executive Summary
        doc.setFontSize(14);
        doc.text('Executive Summary', 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        const summaryLines = doc.splitTextToSize(reportContent.executive_summary, 170);
        doc.text(summaryLines, 20, yPos);
        yPos += summaryLines.length * 5 + 10;

        // Compliance Score
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.text(`Overall Compliance Score: ${reportContent.overall_compliance_score || 'N/A'}%`, 20, yPos);
        yPos += 10;

        // Critical Issues
        if (reportContent.critical_issues && reportContent.critical_issues.length > 0) {
            if (yPos > 240) { doc.addPage(); yPos = 20; }
            doc.setFontSize(14);
            doc.text('Critical Issues', 20, yPos);
            yPos += 7;
            doc.setFontSize(10);
            reportContent.critical_issues.forEach((issue, idx) => {
                if (yPos > 270) { doc.addPage(); yPos = 20; }
                doc.text(`${idx + 1}. ${issue.issue}`, 25, yPos);
                yPos += 5;
                doc.text(`   Severity: ${issue.severity} | Deadline: ${issue.deadline}`, 25, yPos);
                yPos += 5;
                const actionLines = doc.splitTextToSize(`   Action: ${issue.action_required}`, 165);
                doc.text(actionLines, 25, yPos);
                yPos += actionLines.length * 5 + 3;
            });
            yPos += 5;
        }

        // Action Items
        if (reportContent.action_items && reportContent.action_items.length > 0) {
            if (yPos > 240) { doc.addPage(); yPos = 20; }
            doc.setFontSize(14);
            doc.text('Action Items', 20, yPos);
            yPos += 7;
            doc.setFontSize(10);
            reportContent.action_items.slice(0, 10).forEach((item, idx) => {
                if (yPos > 270) { doc.addPage(); yPos = 20; }
                doc.text(`${idx + 1}. [${item.priority}] ${item.action}`, 25, yPos);
                yPos += 5;
            });
        }

        const pdfBytes = doc.output('arraybuffer');

        // Save report to database
        const savedReport = await base44.asServiceRole.entities.SavedReport.create({
            report_name: reportContent.report_title || 'Monthly Compliance Report',
            report_type: 'compliance',
            report_date: new Date().toISOString(),
            report_data: JSON.stringify(reportContent),
            generated_by: user.email
        });

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                'X-Report-ID': savedReport.id
            }
        });

    } catch (error) {
        console.error('Error generating compliance report:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});