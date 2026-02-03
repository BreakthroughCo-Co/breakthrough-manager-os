import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { trigger_type = 'skill_gap_analysis', focus_area = null } = payload;

    // Fetch all practitioners and their training data
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ status: 'active' });
    const assignments = await base44.asServiceRole.entities.TrainingAssignment.list();
    const modules = await base44.asServiceRole.entities.TrainingModule.list();
    const ratings = await base44.asServiceRole.entities.TrainingModuleRating.list();
    const incidents = await base44.asServiceRole.entities.Incident.list('-created_date', 50);
    const breaches = await base44.asServiceRole.entities.ComplianceBreach.list('-created_date', 30);

    // Aggregate data for AI analysis
    const trainingStats = practitioners.map(p => {
      const practitionerAssignments = assignments.filter(a => a.practitioner_id === p.id);
      const completed = practitionerAssignments.filter(a => a.status === 'completed').length;
      const pending = practitionerAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress').length;
      const overdue = practitionerAssignments.filter(a => {
        if (a.status !== 'completed' && a.due_date) {
          return new Date(a.due_date) < new Date();
        }
        return false;
      }).length;

      return {
        practitioner_id: p.id,
        name: p.full_name,
        role: p.role,
        completed_modules: completed,
        pending_modules: pending,
        overdue_modules: overdue,
        certifications: p.certifications || [],
      };
    });

    // Analyze module effectiveness from ratings
    const moduleEffectiveness = {};
    modules.forEach(module => {
      const moduleRatings = ratings.filter(r => r.module_id === module.id);
      if (moduleRatings.length > 0) {
        const avgRating = moduleRatings.reduce((sum, r) => sum + r.effectiveness_rating, 0) / moduleRatings.length;
        const recommendRate = moduleRatings.filter(r => r.would_recommend).length / moduleRatings.length;
        moduleEffectiveness[module.id] = {
          name: module.name,
          avg_rating: avgRating,
          recommend_rate: recommendRate,
          total_ratings: moduleRatings.length,
        };
      }
    });

    // Identify patterns from incidents and breaches
    const incidentPatterns = {};
    incidents.forEach(inc => {
      const category = inc.category || 'Other';
      incidentPatterns[category] = (incidentPatterns[category] || 0) + 1;
    });

    const breachPatterns = {};
    breaches.forEach(breach => {
      const cat = breach.breach_category || 'Other';
      breachPatterns[cat] = (breachPatterns[cat] || 0) + 1;
    });

    // Call AI to analyze team training needs
    const aiPrompt = `You are an expert NDIS training coordinator analyzing team-wide training needs.

TEAM DATA:
${JSON.stringify(trainingStats, null, 2)}

MODULE EFFECTIVENESS:
${JSON.stringify(moduleEffectiveness, null, 2)}

RECENT INCIDENT PATTERNS (last 50):
${JSON.stringify(incidentPatterns, null, 2)}

RECENT COMPLIANCE BREACHES (last 30):
${JSON.stringify(breachPatterns, null, 2)}

AVAILABLE TRAINING CATEGORIES:
- NDIS Compliance
- Behaviour Support
- Clinical Skills
- Policy & Procedure
- Safety & Risk
- Software Systems
- Professional Development
- Emerging Services

TRIGGER TYPE: ${trigger_type}
${focus_area ? `FOCUS AREA: ${focus_area}` : ''}

TASK:
Analyze this data and identify 3-5 critical team-wide training needs. For each need:
1. Identify the specific skill area
2. Determine which practitioners are affected
3. Calculate a gap severity score (0-100)
4. Explain the business impact
5. Recommend specific training modules or content
6. Set priority level
7. Suggest target completion timeline

Consider:
- Incident and breach patterns indicating systemic gaps
- Low-performing or poorly-rated training areas
- Practitioners with overdue or incomplete training
- Emerging service areas (e.g., LEGO Therapy expansion)
- Recent policy changes or compliance requirements

Output as JSON array with this structure:
{
  "training_needs": [
    {
      "skill_area": "string",
      "category": "string (from categories above)",
      "priority": "critical|high|medium|low",
      "affected_practitioner_ids": ["id1", "id2"],
      "gap_severity": 75,
      "business_impact": "explanation",
      "trigger_type": "${trigger_type}",
      "recommended_actions": "specific recommendations",
      "target_completion_weeks": 4,
      "rationale": "detailed explanation"
    }
  ]
}`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          training_needs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                skill_area: { type: 'string' },
                category: { type: 'string' },
                priority: { type: 'string' },
                affected_practitioner_ids: { type: 'array', items: { type: 'string' } },
                gap_severity: { type: 'number' },
                business_impact: { type: 'string' },
                trigger_type: { type: 'string' },
                recommended_actions: { type: 'string' },
                target_completion_weeks: { type: 'number' },
                rationale: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // Save identified training needs to database
    const identifiedNeeds = [];
    for (const need of aiResult.training_needs) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (need.target_completion_weeks * 7));

      const savedNeed = await base44.asServiceRole.entities.TeamTrainingNeed.create({
        skill_area: need.skill_area,
        category: need.category,
        priority: need.priority,
        affected_practitioners: JSON.stringify(need.affected_practitioner_ids),
        gap_severity: need.gap_severity,
        business_impact: need.business_impact,
        trigger_type: need.trigger_type,
        recommended_modules: JSON.stringify([]),
        ai_rationale: need.rationale,
        identified_date: new Date().toISOString().split('T')[0],
        target_completion_date: targetDate.toISOString().split('T')[0],
        status: 'identified',
      });

      identifiedNeeds.push({
        ...savedNeed,
        recommended_actions: need.recommended_actions,
      });
    }

    return Response.json({
      success: true,
      team_training_needs: identifiedNeeds,
      analysis_summary: {
        total_practitioners: practitioners.length,
        total_needs_identified: identifiedNeeds.length,
        critical_needs: identifiedNeeds.filter(n => n.priority === 'critical').length,
        high_needs: identifiedNeeds.filter(n => n.priority === 'high').length,
      },
    });
  } catch (error) {
    console.error('Team training analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});