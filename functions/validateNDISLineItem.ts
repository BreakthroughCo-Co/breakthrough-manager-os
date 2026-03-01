import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// NDIS Pricing Arrangements 2024-25 - key Behaviour Support line items
// Source: NDIS Pricing Arrangements and Price Limits 2024-25
const NDIS_CATALOGUE = {
  // Behaviour Support
  "15_038_0117_1_3": { description: "Behaviour Support - Assessment, Recommendation, Therapy or Training (Other)", max_rate: 214.41, unit: "H" },
  "15_056_0117_1_3": { description: "Behaviour Support - Assessment, Recommendation, Therapy or Training (TTP)", max_rate: 193.99, unit: "H" },
  "15_037_0117_1_3": { description: "Behaviour Support - Specialist Support Coordination", max_rate: 193.99, unit: "H" },
  // Capacity Building - Life Choices
  "07_002_0106_6_3": { description: "Support Coordination", max_rate: 100.14, unit: "H" },
  "07_001_0106_8_3": { description: "Specialist Support Coordination", max_rate: 190.54, unit: "H" },
  // Daily Activities
  "01_011_0107_1_1": { description: "Assistance with Daily Life - Standard", max_rate: 67.56, unit: "H" },
  "01_013_0107_1_1": { description: "Assistance with Daily Life - Night-time Sleepover", max_rate: 265.79, unit: "EA" },
  // Social & Community
  "04_104_0125_6_1": { description: "Access Community, Social & Rec Activities - Standard", max_rate: 67.56, unit: "H" },
  // Plan Management
  "14_033_0127_6_3": { description: "Improved Daily Living - Plan Management", max_rate: 100.14, unit: "H" },
  // LEGO Therapy / Social Skills (Capacity Building)
  "09_009_0117_6_3": { description: "CB Daily Activity - Therapeutic Supports", max_rate: 214.41, unit: "H" },
  "09_010_0117_6_3": { description: "CB Daily Activity - Group-based Therapeutic Supports", max_rate: 53.60, unit: "H" },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

    const { ndis_line_item, rate, service_type } = await req.json();

    if (!ndis_line_item) {
      return Response.json({ valid: true, warnings: [], catalogue_item: null });
    }

    const catalogueItem = NDIS_CATALOGUE[ndis_line_item];
    const warnings = [];

    if (!catalogueItem) {
      warnings.push({
        severity: 'warning',
        field: 'ndis_line_item',
        message: `Line item ${ndis_line_item} is not in the validated NDIS 2024-25 catalogue. Verify against current Pricing Arrangements.`,
      });
    } else {
      if (rate && rate > catalogueItem.max_rate) {
        warnings.push({
          severity: 'error',
          field: 'rate',
          message: `Rate $${rate.toFixed(2)}/hr exceeds NDIS price limit of $${catalogueItem.max_rate.toFixed(2)}/hr for ${catalogueItem.description}. PRODA claim will be rejected.`,
        });
      }
      if (rate && rate <= catalogueItem.max_rate && rate > 0) {
        // Rate is compliant — no warning
      }
    }

    return Response.json({
      valid: !warnings.some(w => w.severity === 'error'),
      warnings,
      catalogue_item: catalogueItem || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});