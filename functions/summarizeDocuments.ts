import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_type, document_ids, summary_type = 'comprehensive' } = await req.json();

    let documents = [];
    let documentContent = '';

    if (document_type === 'case_notes') {
      documents = await Promise.all(
        document_ids.map(id => base44.asServiceRole.entities.CaseNote.get(id))
      );
      documentContent = documents.map(d => 
        `Date: ${d.created_date}\nObservations: ${d.observations || ''}\nProgress: ${d.progress_against_goals || ''}\nRisks: ${d.risk_considerations || ''}`
      ).join('\n\n---\n\n');
    } else if (document_type === 'feedback') {
      documents = await Promise.all(
        document_ids.map(id => base44.asServiceRole.entities.ClientFeedback.get(id))
      );
      documentContent = documents.map(d =>
        `Date: ${d.feedback_date}\nSatisfaction: ${d.overall_satisfaction}/5\nFeedback: ${d.qualitative_feedback || ''}\nAreas: ${d.improvement_areas?.join(', ') || ''}`
      ).join('\n\n---\n\n');
    } else if (document_type === 'incidents') {
      documents = await Promise.all(
        document_ids.map(id => base44.asServiceRole.entities.Incident.get(id))
      );
      documentContent = documents.map(d =>
        `Date: ${d.incident_date}\nType: ${d.incident_type}\nSeverity: ${d.severity}\nDescription: ${d.description || ''}\nRoot Cause: ${d.root_cause || ''}`
      ).join('\n\n---\n\n');
    }

    const summaryInstructions = {
      comprehensive: 'Provide a detailed summary covering all key themes, patterns, and actionable insights',
      executive: 'Create a concise executive summary highlighting only the most critical points',
      action_focused: 'Focus exclusively on action items, recommendations, and next steps'
    };

    const prompt = `
You are summarizing ${document_type} documents for an NDIS practice manager.

DOCUMENT TYPE: ${document_type}
NUMBER OF DOCUMENTS: ${documents.length}
SUMMARY TYPE: ${summary_type}

DOCUMENTS:
${documentContent}

${summaryInstructions[summary_type] || summaryInstructions.comprehensive}

Provide:
1. KEY THEMES: Major patterns across documents
2. CRITICAL INSIGHTS: Most important findings
3. ACTION ITEMS: Required follow-up actions
4. TRENDS: Temporal or thematic trends identified
5. RISK INDICATORS: Any concerns requiring attention
6. RECOMMENDATIONS: Evidence-based next steps

Format for rapid managerial review.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          key_themes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                frequency: { type: "string" },
                significance: { type: "string" }
              }
            }
          },
          critical_insights: {
            type: "array",
            items: { type: "string" }
          },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                responsible_party: { type: "string" },
                timeline: { type: "string" }
              }
            }
          },
          trends: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trend: { type: "string" },
                direction: { type: "string" },
                implications: { type: "string" }
              }
            }
          },
          risk_indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                severity: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      summary: aiResponse,
      metadata: {
        document_type,
        documents_analyzed: documents.length,
        summary_type
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});