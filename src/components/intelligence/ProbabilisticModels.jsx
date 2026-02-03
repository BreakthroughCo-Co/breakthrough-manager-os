import { base44 } from '@/api/base44Client';

/**
 * Probabilistic Intelligence Layer (LLM-Based)
 * For predictions, trends, and risk likelihood
 * NEVER for compliance assertions
 */

export class ProbabilisticModels {
  /**
   * Predict risk escalation likelihood
   */
  static async predictRiskEscalation(client, abcRecords, caseNotes, riskAssessments) {
    try {
      const context = {
        recent_abc_data: abcRecords.slice(0, 20).map(r => ({
          date: r.date,
          intensity: r.intensity,
          duration: r.duration,
          antecedent: r.antecedent_category,
          consequence: r.consequence_category,
        })),
        recent_progress: caseNotes.slice(0, 10).map(n => ({
          date: n.session_date,
          progress_rating: n.progress_rating,
        })),
        current_risk_level: riskAssessments[0]?.residual_risk_level,
        client_context: {
          service_type: client.service_type,
          time_in_service: this.calculateServiceDuration(client.plan_start_date),
        },
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical psychologist analyzing behavioral data for risk prediction.

Data:
${JSON.stringify(context, null, 2)}

Task: Analyze patterns and predict likelihood of behavioral risk escalation in the next 30 days.

Consider:
1. Frequency/intensity trends
2. Antecedent pattern changes
3. Progress trajectory
4. Environmental factors

IMPORTANT: This is a probabilistic prediction, not a compliance determination. Provide likelihood estimation with confidence level.`,
        response_json_schema: {
          type: 'object',
          properties: {
            escalation_likelihood: {
              type: 'string',
              enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
            },
            confidence_level: {
              type: 'number',
              description: '0-100 confidence score',
            },
            contributing_factors: { type: 'array', items: { type: 'string' } },
            early_warning_signs: { type: 'array', items: { type: 'string' } },
            recommended_monitoring: { type: 'string' },
            prediction_basis: { type: 'string' },
          },
        },
      });

      return {
        type: 'probabilistic',
        prediction: response,
        generated_at: new Date().toISOString(),
        note: 'This is a prediction, not a deterministic assessment',
      };
    } catch (error) {
      console.error('Risk prediction failed:', error);
      return null;
    }
  }

  /**
   * Predict behavior trend
   */
  static async predictBehaviorTrend(abcRecords) {
    try {
      const timeSeriesData = abcRecords.map(r => ({
        date: r.date,
        intensity: r.intensity,
        frequency: 1,
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing behavior trend data for pattern prediction.

Time series data:
${JSON.stringify(timeSeriesData, null, 2)}

Task: Predict the likely trend for the next 14 days based on historical patterns.

Provide:
1. Trend direction (increasing, stable, decreasing)
2. Confidence level
3. Factors influencing the trend
4. Recommended data points to monitor

This is pattern analysis, not clinical diagnosis.`,
        response_json_schema: {
          type: 'object',
          properties: {
            trend_direction: {
              type: 'string',
              enum: ['increasing', 'stable', 'decreasing', 'variable'],
            },
            confidence_level: { type: 'number' },
            predicted_frequency: { type: 'string' },
            factors: { type: 'array', items: { type: 'string' } },
            monitoring_recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      return {
        type: 'probabilistic',
        trend_analysis: response,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Trend prediction failed:', error);
      return null;
    }
  }

  /**
   * Suggest intervention adjustments (probabilistic)
   */
  static async suggestInterventionAdjustments(bsp, recentOutcomes) {
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a behavior support practitioner reviewing intervention effectiveness.

Current interventions:
${JSON.stringify(bsp.interventions || [], null, 2)}

Recent outcomes:
${JSON.stringify(recentOutcomes, null, 2)}

Task: Suggest potential intervention adjustments based on outcome data.

IMPORTANT: These are suggestions for clinical review, not directives. Final decisions require clinical judgment.`,
        response_json_schema: {
          type: 'object',
          properties: {
            adjustment_suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  intervention_id: { type: 'string' },
                  suggestion: { type: 'string' },
                  rationale: { type: 'string' },
                  confidence: { type: 'number' },
                },
              },
            },
            overall_assessment: { type: 'string' },
            data_quality_notes: { type: 'string' },
          },
        },
      });

      return {
        type: 'probabilistic',
        suggestions: response,
        generated_at: new Date().toISOString(),
        disclaimer: 'For clinical review only. Not prescriptive.',
      };
    } catch (error) {
      console.error('Adjustment suggestion failed:', error);
      return null;
    }
  }

  static calculateServiceDuration(startDate) {
    if (!startDate) return null;
    const start = new Date(startDate);
    const now = new Date();
    const months = (now - start) / (1000 * 60 * 60 * 24 * 30);
    return Math.round(months);
  }
}