import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all practitioner and development data
    const [
      practitioners,
      skills,
      trainingAssignments,
      caseNotes,
      billingRecords,
      careerPathways
    ] = await Promise.all([
      base44.entities.Practitioner.list(),
      base44.entities.PractitionerSkill.list(),
      base44.entities.TrainingAssignment.list(),
      base44.entities.CaseNote.list(),
      base44.entities.BillingRecord.list(),
      base44.entities.CareerPathway.list()
    ]);

    const recommendations = [];

    // Analyze each practitioner
    for (const practitioner of practitioners || []) {
      const practitionerSkills = skills?.filter(s => s.practitioner_id === practitioner.id) || [];
      const practitionerTraining = trainingAssignments?.filter(t => t.practitioner_id === practitioner.id) || [];
      const practitionerNotes = caseNotes?.filter(n => n.recorded_by === practitioner.full_name) || [];
      const practitionerBilling = billingRecords?.filter(b => b.practitioner_id === practitioner.id) || [];
      const practitionerPathway = careerPathways?.find(cp => cp.practitioner_id === practitioner.id);

      // Identify skill gaps
      const requiredSkillsByRole = {
        'Behaviour Support Practitioner': ['NDIS Compliance', 'Behaviour Support', 'Clinical Skills', 'Documentation'],
        'Senior Practitioner': ['Leadership', 'NDIS Compliance', 'Clinical Skills', 'Communication'],
        'Practice Lead': ['Leadership', 'Strategic Thinking', 'HR Management', 'Compliance'],
        'Allied Health Assistant': ['Clinical Skills', 'Communication', 'NDIS Compliance']
      };

      const requiredSkills = requiredSkillsByRole[practitioner.role] || [];
      const currentSkills = practitionerSkills.map(s => s.skill_category);
      const skillGaps = requiredSkills.filter(skill => !currentSkills.includes(skill));

      // Calculate performance metrics
      const avgBillableHours = practitionerBilling.length > 0
        ? practitionerBilling.reduce((sum, b) => sum + (b.duration_hours || 0), 0) / practitionerBilling.length
        : 0;
      const billablePerformance = practitioner.billable_hours_target
        ? (practitioner.billable_hours_actual || 0) / practitioner.billable_hours_target
        : 0;

      // Calculate CPD hours completed
      const completedTraining = practitionerTraining?.filter(t => t.status === 'completed') || [];
      const totalCPDHours = completedTraining.reduce((sum, t) => sum + (t.cpd_hours_granted || 0), 0);

      // Analyze engagement and effectiveness
      const caseNoteCount = practitionerNotes.length;
      const qualityIndicator = caseNoteCount > 0 ? 'active' : 'inactive';

      // Generate training recommendations
      const trainingRecommendations = [];
      const prompt = `
Analyze this NDIS practitioner's development needs and recommend targeted training:

PRACTITIONER PROFILE:
- Role: ${practitioner.role}
- Current Caseload: ${practitioner.current_caseload}/${practitioner.caseload_capacity}
- Billable Hours Performance: ${(billablePerformance * 100).toFixed(1)}%
- Case Notes Created: ${caseNoteCount}
- CPD Hours Completed: ${totalCPDHours}

CURRENT SKILLS:
${currentSkills.map(s => `- ${s}`).join('\n')}

IDENTIFIED SKILL GAPS:
${skillGaps.map(s => `- ${s}`).join('\n')}

Provide recommendations in JSON format:
{
  "critical_training_needs": [
    {
      "skill_gap": "specific gap",
      "training_module": "recommended module",
      "priority": "critical|high|medium|low",
      "estimated_hours": 20,
      "business_justification": "why this is needed",
      "career_benefit": "how it supports progression"
    }
  ],
  "cpd_requirements": {
    "hours_required_annually": 20,
    "hours_completed_this_year": ${totalCPDHours},
    "hours_gap": ${Math.max(0, 20 - totalCPDHours)}
  },
  "career_pathway": {
    "current_role": "${practitioner.role}",
    "recommended_next_role": "suggested progression",
    "readiness_percentage": 65,
    "timeline_months": 12,
    "key_competencies_to_develop": ["competency1", "competency2"]
  },
  "performance_observations": "summary of performance",
  "recommended_mentorship": "mentor or supervisor recommendation"
}`;

      const developmentAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            critical_training_needs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill_gap: { type: 'string' },
                  training_module: { type: 'string' },
                  priority: { type: 'string' },
                  estimated_hours: { type: 'number' },
                  business_justification: { type: 'string' },
                  career_benefit: { type: 'string' }
                }
              }
            },
            cpd_requirements: {
              type: 'object',
              properties: {
                hours_required_annually: { type: 'number' },
                hours_completed_this_year: { type: 'number' },
                hours_gap: { type: 'number' }
              }
            },
            career_pathway: {
              type: 'object',
              properties: {
                current_role: { type: 'string' },
                recommended_next_role: { type: 'string' },
                readiness_percentage: { type: 'number' },
                timeline_months: { type: 'number' },
                key_competencies_to_develop: { type: 'array', items: { type: 'string' } }
              }
            },
            performance_observations: { type: 'string' },
            recommended_mentorship: { type: 'string' }
          }
        }
      });

      recommendations.push({
        practitioner_id: practitioner.id,
        practitioner_name: practitioner.full_name,
        current_role: practitioner.role,
        analysis: developmentAnalysis,
        skill_gaps: skillGaps,
        billable_performance: billablePerformance,
        cpd_hours_completed: totalCPDHours,
        engagement_level: qualityIndicator
      });
    }

    return Response.json({
      success: true,
      analysis_date: new Date().toISOString(),
      practitioners_analyzed: practitioners?.length || 0,
      recommendations
    });
  } catch (error) {
    console.error('Development analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});