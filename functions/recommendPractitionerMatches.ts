import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Recommend Practitioner Matches
 * Analyzes client profile and practitioner data to recommend optimal matches
 * Prioritizes by success outcomes, engagement patterns, and skill alignment
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { client_id } = payload;

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Fetch client and related data
    const [client, practitioners, skills, goals, caseNotes, assessments] = await Promise.all([
      base44.entities.Client.get(client_id),
      base44.entities.Practitioner.list(),
      base44.entities.PractitionerSkill.list(),
      base44.entities.ClientGoal.list(),
      base44.entities.CaseNote.list('-session_date', 100),
      base44.entities.MotivationAssessmentScale.list()
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client-specific data
    const clientGoals = goals.filter(g => g.client_id === client.id);
    const clientNotes = caseNotes.filter(n => n.client_id === client.id);
    const clientAssessment = assessments.find(a => a.client_id === client.id);

    // Build client profile summary
    const clientProfile = `
CLIENT PROFILE FOR PRACTITIONER MATCHING:

Name: ${client.full_name}
Service Type: ${client.service_type}
Risk Level: ${client.risk_level}
Status: ${client.status}

NDIS GOALS (${clientGoals.length} active):
${clientGoals.map(g => `- ${g.goal_description} (${g.ndis_domain}): ${g.status}`).join('\n')}

MOTIVATION PROFILE:
${clientAssessment ? `Primary: ${clientAssessment.primary_motivation}, Secondary: ${clientAssessment.secondary_motivations?.join(', ')}` : 'No assessment available'}

RECENT PROGRESS:
${clientNotes.slice(0, 3).map(n => `- ${n.session_date}: ${n.progress_rating}`).join('\n')}

KEY CONSIDERATIONS:
- Goal domains: ${[...new Set(clientGoals.map(g => g.ndis_domain))].join(', ')}
- Preferred intervention style: Based on motivation assessment
- Performance requirements: Alignment with ${clientGoals.length} active goals
`;

    // Build practitioner evaluation data
    const practitionerProfiles = practitioners
      .filter(p => p.status === 'active')
      .map(p => {
        const practitionerSkills = skills.filter(s => s.practitioner_id === p.id);
        const skillSummary = practitionerSkills
          .map(s => `${s.skill_name} (${s.proficiency_level})`)
          .join(', ');

        const criticalSkills = practitionerSkills.filter(s => s.is_critical);

        return {
          practitioner_id: p.id,
          full_name: p.full_name,
          role: p.role,
          current_caseload: p.current_caseload || 0,
          caseload_capacity: p.caseload_capacity || 10,
          availability_percent: Math.max(0, ((p.caseload_capacity - (p.current_caseload || 0)) / p.caseload_capacity) * 100),
          skills: skillSummary,
          critical_skills: criticalSkills.map(s => s.skill_name).join(', '),
          certifications: (p.certifications || []).join(', '),
          experience_summary: `${p.role} - ${p.certifications?.length || 0} certifications`
        };
      });

    const matchingContext = `
${clientProfile}

AVAILABLE PRACTITIONERS:
${practitionerProfiles.map(pp => `
- ${pp.full_name} (${pp.role})
  Caseload: ${pp.current_caseload}/${pp.caseload_capacity} (${pp.availability_percent.toFixed(0)}% available)
  Critical Skills: ${pp.critical_skills || 'None listed'}
  All Skills: ${pp.skills}
  Experience: ${pp.experience_summary}
`).join('\n')}
`;

    // Use AI to generate recommendations
    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `${matchingContext}

Based on the client profile and practitioner data, provide:

1. **Top 3 Recommended Matches**
   - For each, explain alignment with client goals, motivation profile, and service type
   - Consider skill fit, caseload capacity, and experience relevance
   - Provide a match score (0-100)

2. **Key Matching Factors**
   - Which client characteristics are most important for successful outcomes
   - What practitioner qualities are critical for this client

3. **Risk Factors**
   - Any misalignments or concerns for each match
   - How to mitigate risks

4. **Implementation Notes**
   - Suggested onboarding approach for each match
   - How to introduce client to recommended practitioner
   - Success milestones to monitor`,
      response_json_schema: {
        type: "object",
        properties: {
          top_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rank: { type: "number" },
                practitioner_name: { type: "string" },
                match_score: { type: "number" },
                alignment_summary: { type: "string" },
                key_strengths: { type: "array", items: { type: "string" } },
                skill_alignment: { type: "array", items: { type: "string" } },
                caseload_fit: { type: "string" },
                risk_factors: { type: "array", items: { type: "string" } },
                mitigation_strategies: { type: "array", items: { type: "string" } },
                onboarding_approach: { type: "string" }
              }
            }
          },
          key_matching_factors: {
            type: "array",
            items: { type: "string" }
          },
          success_metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                metric: { type: "string" },
                measurement_period_days: { type: "number" },
                target: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      analysis_date: new Date().toISOString(),
      client_id,
      client_name: client.full_name,
      client_service_type: client.service_type,
      practitioners_evaluated: practitionerProfiles.length,
      recommendations
    });

  } catch (error) {
    console.error('Practitioner matching error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});