/**
 * Health Check Endpoint
 * 
 * Simple readiness check for monitoring and uptime tracking.
 * Returns system status and key metrics.
 */

Deno.serve(async (req) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Deno.env.get('DENO_DEPLOYMENT_ID') || 'local',
            version: '1.0.0',
            checks: {
                api: 'ok',
                // Add more checks as needed
            }
        };
        
        return Response.json(health);
    } catch (error) {
        return Response.json({
            status: 'unhealthy',
            error: error.message
        }, { status: 503 });
    }
});