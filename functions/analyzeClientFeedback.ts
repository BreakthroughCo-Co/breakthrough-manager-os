import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather client feedback data
        const feedbackEntries = await base44.entities.ClientFeedback.list('-created_date', 500);
        const clients = await base44.entities.Client.list();
        const practitioners = await base44.entities.Practitioner.list();

        // Enrich feedback with client and practitioner names
        const enrichedFeedback = feedbackEntries.map(entry => {
            const client = clients.find(c => c.id === entry.client_id);
            const practitioner = practitioners.find(p => p.id === entry.practitioner_id);
            
            return {
                ...entry,
                client_name: client?.full_name || entry.client_name,
                practitioner_name: practitioner?.full_name || entry.practitioner_name
            };
        });

        // AI Analysis for Sentiment and Categorization
        const prompt = `You are an AI assistant specializing in client feedback analysis for NDIS service providers.

Analyze the following client feedback entries to perform sentiment analysis, identify recurring themes, automatically categorize feedback, and flag critical comments:

CLIENT FEEDBACK ENTRIES (${enrichedFeedback.length} total):
${JSON.stringify(enrichedFeedback.slice(0, 100), null, 2)}

Your analysis should provide:
1. Overall sentiment summary across all feedback
2. Sentiment analysis for each feedback entry
3. Automatic categorization of feedback into themes (service quality, communication, practitioner performance, accessibility, goal progress, etc.)
4. Identification of recurring themes and patterns
5. Critical comments requiring immediate managerial attention
6. Positive highlights and success stories
7. Actionable recommendations based on feedback trends

Consider:
- Qualitative feedback content for sentiment inference
- Rating scores as quantitative indicators
- Improvement areas mentioned
- "Would recommend" responses
- Patterns across practitioners, service types, or time periods

Flag critical feedback based on:
- Very low ratings (1-2 out of 5)
- Negative sentiment in qualitative comments
- Mentions of safety concerns, service failures, or complaints
- Repeated issues from the same client

Provide a comprehensive, actionable Feedback Summary Report suitable for senior management review.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_sentiment_summary: {
                        type: "string",
                        description: "Summary of overall client feedback sentiment"
                    },
                    total_feedback_analyzed: { type: "number" },
                    average_satisfaction_score: { type: "number" },
                    
                    sentiment_distribution: {
                        type: "object",
                        properties: {
                            positive_count: { type: "number" },
                            neutral_count: { type: "number" },
                            negative_count: { type: "number" },
                            positive_percentage: { type: "number" },
                            negative_percentage: { type: "number" }
                        }
                    },
                    
                    feedback_by_sentiment: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                feedback_id: { type: "string" },
                                client_name: { type: "string" },
                                practitioner_name: { type: "string" },
                                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                                confidence: { type: "number" },
                                key_sentiment_indicators: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    categorized_feedback: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                count: { type: "number" },
                                avg_rating: { type: "number" },
                                key_themes: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                representative_comments: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    recurring_themes: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                theme: { type: "string" },
                                frequency: { type: "number" },
                                sentiment: { type: "string" },
                                description: { type: "string" },
                                affected_practitioners: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    critical_feedback: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                feedback_id: { type: "string" },
                                client_name: { type: "string" },
                                practitioner_name: { type: "string" },
                                priority: { type: "string", enum: ["urgent", "high", "medium"] },
                                issue_summary: { type: "string" },
                                recommended_action: { type: "string" },
                                requires_immediate_review: { type: "boolean" }
                            }
                        }
                    },
                    
                    positive_highlights: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                feedback_id: { type: "string" },
                                client_name: { type: "string" },
                                practitioner_name: { type: "string" },
                                highlight: { type: "string" },
                                success_factor: { type: "string" }
                            }
                        }
                    },
                    
                    practitioner_performance_insights: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                practitioner_name: { type: "string" },
                                feedback_count: { type: "number" },
                                avg_satisfaction: { type: "number" },
                                sentiment_summary: { type: "string" },
                                strengths: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                areas_for_improvement: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    actionable_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recommendation: { type: "string" },
                                priority: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    
                    executive_summary: {
                        type: "string",
                        description: "Concise executive summary for senior management"
                    }
                }
            }
        });

        return Response.json({
            analysis: analysis,
            feedback_analyzed: enrichedFeedback.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing client feedback:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});