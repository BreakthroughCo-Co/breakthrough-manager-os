import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { title, description, category, file_name } = await req.json();
        if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an NDIS document management specialist. Generate 5-8 concise, lowercase keyword tags for the following document. Tags must be NDIS-domain specific and useful for searching within an NDIS practice management system.

Document Title: ${title}
Category: ${category || 'Unknown'}
Description: ${description || 'None provided'}
File Name: ${file_name || 'Unknown'}

Return only the tags as a JSON array of strings. Examples of good tags: "ndis", "behaviour-support", "restrictive-practices", "worker-screening", "plan-review", "billing", "compliance", "incident-report"`,
            response_json_schema: {
                type: "object",
                properties: {
                    tags: { type: "array", items: { type: "string" } }
                }
            }
        });

        return Response.json({ tags: result?.tags || [] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});