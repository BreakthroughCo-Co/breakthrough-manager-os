import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { practitioner_id, gap_area, module_focus } = await req.json();

        const [practitioner, performanceReports, relatedIncidents, knowledgeBase] = await Promise.all([
            base44.asServiceRole.entities.Practitioner.get(practitioner_id),
            base44.asServiceRole.entities.MonthlyPerformanceReport.filter({ practitioner_id }),
            base44.asServiceRole.entities.Incident.list('-created_date', 50),
            base44.asServiceRole.entities.KnowledgeBaseArticle.filter({ category: 'NDIS Compliance' })
        ]);

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS compliance training content developer. Generate a personalized training module for a practitioner.

Practitioner: ${practitioner.full_name}
Role: ${practitioner.role}
Gap Area: ${gap_area}
Module Focus: ${module_focus}

Recent Performance Context:
${JSON.stringify(performanceReports[0], null, 2)}

Create a comprehensive training module with:
1. Learning objectives (3-5 specific, measurable)
2. Content sections with detailed explanations
3. Real-world NDIS scenarios relevant to the gap
4. 10 quiz questions (mix of multiple choice and scenario-based)
5. Practical exercises
6. Reference materials and further reading

Ensure content is:
- NDIS-specific and compliance-focused
- Directly addressing the identified gap
- Actionable and practice-oriented
- Aligned with NDIS Practice Standards`,
            response_json_schema: {
                type: "object",
                properties: {
                    module_title: { type: "string" },
                    learning_objectives: { type: "array", items: { type: "string" } },
                    estimated_duration_minutes: { type: "number" },
                    content_sections: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                section_title: { type: "string" },
                                content: { type: "string" },
                                key_points: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    real_world_scenarios: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                scenario_title: { type: "string" },
                                scenario_description: { type: "string" },
                                discussion_points: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    quiz_questions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question: { type: "string" },
                                question_type: { type: "string" },
                                options: { type: "array", items: { type: "string" } },
                                correct_answer: { type: "string" },
                                explanation: { type: "string" }
                            }
                        }
                    },
                    practical_exercises: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                exercise_title: { type: "string" },
                                instructions: { type: "string" },
                                expected_outcome: { type: "string" }
                            }
                        }
                    },
                    reference_materials: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // Create TrainingModule entity
        const newModule = await base44.asServiceRole.entities.TrainingModule.create({
            module_name: response.module_title,
            category: gap_area,
            difficulty_level: 'intermediate',
            estimated_duration_minutes: response.estimated_duration_minutes,
            content_markdown: JSON.stringify(response.content_sections),
            learning_objectives: response.learning_objectives,
            quiz_questions: JSON.stringify(response.quiz_questions),
            passing_score: 80,
            cpd_hours: Math.ceil(response.estimated_duration_minutes / 60),
            is_active: true
        });

        // Auto-assign to practitioner
        await base44.asServiceRole.entities.TrainingProgress.create({
            practitioner_id,
            practitioner_name: practitioner.full_name,
            module_id: newModule.id,
            module_name: newModule.module_name,
            status: 'not_started',
            assigned_by: user.email,
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days
        });

        return Response.json({
            success: true,
            module: response,
            module_id: newModule.id,
            auto_assigned: true,
            generated_date: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});