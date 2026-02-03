import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data_points, report_category } = await req.json();

        // Analyze available data to suggest optimizations
        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a data visualization and NDIS reporting expert. A user is building a custom report.

Report Category: ${report_category || 'General'}
Selected Data Points: ${JSON.stringify(data_points, null, 2)}

Based on these selections, provide:
1. Optimal chart types for each data point
2. Recommended groupings and filters
3. Correlations to highlight
4. Additional data points that would provide valuable insights
5. Best practices for NDIS reporting in this category
6. Suggested layout and dashboard structure

Make recommendations specific, actionable, and focused on decision-making value.`,
            response_json_schema: {
                type: "object",
                properties: {
                    recommended_charts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                data_point: { type: "string" },
                                chart_type: { type: "string" },
                                rationale: { type: "string" },
                                configuration: {
                                    type: "object",
                                    properties: {
                                        x_axis: { type: "string" },
                                        y_axis: { type: "string" },
                                        grouping: { type: "string" },
                                        aggregation: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    correlations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                data_points: { type: "array", items: { type: "string" } },
                                relationship: { type: "string" },
                                insight: { type: "string" },
                                visualization_suggestion: { type: "string" }
                            }
                        }
                    },
                    additional_data_points: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                data_point: { type: "string" },
                                entity: { type: "string" },
                                reason: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    filters_recommended: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                filter_field: { type: "string" },
                                filter_type: { type: "string" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    layout_suggestions: {
                        type: "object",
                        properties: {
                            grid_structure: { type: "string" },
                            priority_ordering: { type: "array", items: { type: "string" } },
                            visual_hierarchy: { type: "string" }
                        }
                    },
                    best_practices: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            suggestions: analysis,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating report suggestions:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});