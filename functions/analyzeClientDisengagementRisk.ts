import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Analyze Client Disengagement Risk
 * Identifies clients at risk of disengagement based on:
 * - Communication patterns and response frequency
 * - Session attendance and scheduling consistency
 * - Progress trend and goal momentum
 * - Sentiment analysis of recent communications
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch client data for disengagement analysis
    const [clients, caseNotes, communications, goals] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.CaseNote.list('-session_date', 500),
      base44.entities.ClientCommunication.list('-sent_date', 300),
      base44.entities.ClientGoal.list()
    ]);

    // Analyze each client's engagement metrics
    const engagementAnalyses = clients
      .filter(client => client.status === 'active') // Only analyze active clients
      .map(client => {
        const clientNotes = caseNotes.filter(cn => cn.client_id === client.id);
        const clientComms = communications.filter(c => c.client_id === client.id);
        const clientGoals = goals.filter(g => g.client_id === client.id);

        // Calculate session consistency (expected ~2 sessions per week = 8/month)
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const last60Days = new Date();
        last60Days.setDate(last60Days.getDate() - 60);

        const sessionsLast30d = clientNotes.filter(n => new Date(n.session_date) > last30Days).length;
        const sessionsLast60d = clientNotes.filter(n => new Date(n.session_date) > last60Days).length;
        const sessionTrendDelta = sessionsLast30d - (sessionsLast60d - sessionsLast30d);

        // Communication pattern analysis
        const commsLast30d = clientComms.filter(c => new Date(c.sent_date) > last30Days).length;
        const commsLast60d = clientComms.filter(c => new Date(c.sent_date) > last60Days).length;
        const commTrendDelta = commsLast30d - (commsLast60d - commsLast30d);

        // Response frequency (if we track recipient response)
        const responsesReceivedLast30d = clientComms
          .filter(c => new Date(c.sent_date) > last30Days && c.recipient_response)
          .length;
        const responseRate = commsLast30d > 0 ? (responsesReceivedLast30d / commsLast30d) * 100 : 0;

        // Progress momentum from case notes
        const recentNotes = clientNotes.slice(0, 10);
        const progressRatings = { 'regression': 1, 'no_change': 2, 'emerging': 3, 'progressing': 4, 'achieved': 5 };
        const recentProgressScores = recentNotes.map(n => progressRatings[n.progress_rating] || 0);
        const avgRecentProgress = recentProgressScores.length > 0 
          ? recentProgressScores.reduce((a, b) => a + b) / recentProgressScores.length 
          : 0;

        // Goal progress
        const onTrackGoals = clientGoals.filter(g => g.status === 'on_track' || g.status === 'in_progress').length;
        const atRiskGoals = clientGoals.filter(g => g.status === 'at_risk').length;
        const goalMomentumScore = (onTrackGoals / Math.max(1, clientGoals.length)) * 100;

        // Calculate disengagement risk score (0-100)
        let riskScore = 0;
        
        // Session consistency (0-30 points)
        if (sessionsLast30d < 2) riskScore += 30; // Less than 2 sessions in 30 days is high risk
        else if (sessionsLast30d < 4) riskScore += 20;
        else if (sessionTrendDelta < -2) riskScore += 15; // Declining session frequency
        
        // Communication responsiveness (0-25 points)
        if (responseRate < 20) riskScore += 25;
        else if (responseRate < 50) riskScore += 15;
        else if (commTrendDelta < -3) riskScore += 10;
        
        // Progress momentum (0-25 points)
        if (avgRecentProgress < 2) riskScore += 25; // Regression or no change
        else if (avgRecentProgress < 3) riskScore += 15;
        else if (atRiskGoals > onTrackGoals) riskScore += 10;
        
        // Overdue plan review (0-20 points)
        if (client.plan_end_date) {
          const daysUntilExpiry = Math.ceil((new Date(client.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 30 && goalMomentumScore < 50) riskScore += 20;
          else if (daysUntilExpiry < 0) riskScore += 15;
        }

        return {
          client_id: client.id,
          client_name: client.full_name,
          assigned_practitioner_id: client.assigned_practitioner_id,
          disengagement_risk_score: Math.min(100, riskScore),
          risk_level: riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'moderate' : 'low',
          sessions_last_30d: sessionsLast30d,
          session_trend: sessionTrendDelta > 2 ? 'improving' : sessionTrendDelta < -2 ? 'declining' : 'stable',
          communications_last_30d: commsLast30d,
          response_rate_percent: Math.round(responseRate),
          average_recent_progress: parseFloat(avgRecentProgress.toFixed(2)),
          on_track_goals: onTrackGoals,
          at_risk_goals: atRiskGoals,
          goal_momentum_score: Math.round(goalMomentumScore),
          days_until_plan_expiry: client.plan_end_date 
            ? Math.ceil((new Date(client.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
          primary_risk_factors: [
            sessionsLast30d < 2 && 'Minimal session attendance',
            responseRate < 20 && 'Low communication response rate',
            avgRecentProgress < 2 && 'Declining progress trajectory',
            atRiskGoals > onTrackGoals && 'Multiple goals at risk',
            client.plan_end_date && Math.ceil((new Date(client.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24)) < 30 && 'Plan expiring soon without momentum'
          ].filter(Boolean)
        };
      });

    // Segment clients by risk level
    const criticalRiskClients = engagementAnalyses.filter(c => c.risk_level === 'critical');
    const highRiskClients = engagementAnalyses.filter(c => c.risk_level === 'high');
    const moderateRiskClients = engagementAnalyses.filter(c => c.risk_level === 'moderate');

    // Create or update RiskAlert for critical clients
    for (const criticalClient of criticalRiskClients) {
      await base44.asServiceRole.entities.RiskAlert.create({
        client_id: criticalClient.client_id,
        client_name: criticalClient.client_name,
        alert_type: 'high_risk_detected',
        risk_score: criticalClient.disengagement_risk_score,
        risk_level: 'critical',
        contributing_factors: JSON.stringify(criticalClient.primary_risk_factors),
        triggered_date: new Date().toISOString(),
        notified_staff: JSON.stringify([user.email]),
        status: 'active'
      });
    }

    return Response.json({
      analysis_date: new Date().toISOString(),
      total_clients_analyzed: engagementAnalyses.length,
      critical_risk_count: criticalRiskClients.length,
      high_risk_count: highRiskClients.length,
      moderate_risk_count: moderateRiskClients.length,
      critical_risk_clients: criticalRiskClients.sort((a, b) => b.disengagement_risk_score - a.disengagement_risk_score),
      high_risk_clients: highRiskClients.sort((a, b) => b.disengagement_risk_score - a.disengagement_risk_score),
      moderate_risk_clients: moderateRiskClients.sort((a, b) => b.disengagement_risk_score - a.disengagement_risk_score),
      all_analyses: engagementAnalyses.sort((a, b) => b.disengagement_risk_score - a.disengagement_risk_score)
    });

  } catch (error) {
    console.error('Client disengagement analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});