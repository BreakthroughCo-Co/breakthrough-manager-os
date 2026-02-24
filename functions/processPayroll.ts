import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_shared/requireRole.js';
import { validateRequest } from './_shared/requestValidator.js';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Process Payroll with Award Interpretation
 * 
 * Automates payroll calculation using SCHADS Award rates and rules.
 * Interprets overtime, penalty rates, and allowances.
 * 
 * NDIS Compliance: Accurate wage calculation and record-keeping
 */

// SCHADS Award rates (2026 rates - update annually)
const SCHADS_RATES = {
  'Level 2': {
    base: 29.45,
    overtime_first_2hrs: 1.5,
    overtime_after_2hrs: 2.0,
    saturday: 1.5,
    sunday: 1.75,
    public_holiday: 2.5
  },
  'Level 3': {
    base: 31.20,
    overtime_first_2hrs: 1.5,
    overtime_after_2hrs: 2.0,
    saturday: 1.5,
    sunday: 1.75,
    public_holiday: 2.5
  },
  'Level 4': {
    base: 34.85,
    overtime_first_2hrs: 1.5,
    overtime_after_2hrs: 2.0,
    saturday: 1.5,
    sunday: 1.75,
    public_holiday: 2.5
  },
  'Level 5': {
    base: 38.90,
    overtime_first_2hrs: 1.5,
    overtime_after_2hrs: 2.0,
    saturday: 1.5,
    sunday: 1.75,
    public_holiday: 2.5
  }
};

const TAX_RATES = [
  { threshold: 18200, rate: 0 },
  { threshold: 45000, rate: 0.19 },
  { threshold: 120000, rate: 0.325 },
  { threshold: 180000, rate: 0.37 },
  { threshold: Infinity, rate: 0.45 }
];

const SUPER_RATE = 0.115; // 11.5% for 2026

Deno.serve(async (req) => {
    const logger = createRequestLogger(req);
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        requireAdmin(user);
        
        const payload = await req.json();
        
        validateRequest(payload, {
            required: ['pay_period_start', 'pay_period_end', 'pay_date'],
            types: {
                pay_period_start: 'string',
                pay_period_end: 'string',
                pay_date: 'string'
            },
            dates: ['pay_period_start', 'pay_period_end', 'pay_date']
        });
        
        const { pay_period_start, pay_period_end, pay_date } = payload;
        
        logger.info('Starting payroll processing', {
            period_start: pay_period_start,
            period_end: pay_period_end
        });
        
        // Get all approved timesheets for period
        const timesheets = await base44.asServiceRole.entities.Timesheet.filter({
            pay_period_start: pay_period_start,
            pay_period_end: pay_period_end,
            status: 'approved'
        });
        
        if (timesheets.length === 0) {
            return Response.json({
                error: 'No approved timesheets found for this period'
            }, { status: 400 });
        }
        
        // Create payroll run
        const payrollRun = await base44.asServiceRole.entities.PayrollRun.create({
            run_name: `Fortnightly Pay - ${pay_date}`,
            pay_period_start,
            pay_period_end,
            pay_date,
            status: 'calculating',
            employee_count: timesheets.length,
            calculation_method: 'SCHADS Award 2010'
        });
        
        const lineItems = [];
        let totalGross = 0;
        let totalTax = 0;
        let totalSuper = 0;
        let totalNet = 0;
        
        // Process each timesheet
        for (const timesheet of timesheets) {
            try {
                const practitioner = await base44.entities.Practitioner.get(timesheet.practitioner_id);
                
                if (!practitioner) {
                    logger.warn('Practitioner not found', { practitioner_id: timesheet.practitioner_id });
                    continue;
                }
                
                // Get award classification from practitioner
                const awardLevel = practitioner.award_classification || 'Level 3';
                const rates = SCHADS_RATES[awardLevel];
                
                if (!rates) {
                    logger.error('Invalid award level', { award_level: awardLevel });
                    continue;
                }
                
                // Calculate pay components
                const ordinaryPay = (timesheet.total_ordinary_hours || 0) * rates.base;
                
                // Overtime calculation (first 2 hours at 1.5x, after that 2.0x)
                const overtimeHours = timesheet.total_overtime_hours || 0;
                const overtimeFirst2 = Math.min(overtimeHours, 2) * rates.base * rates.overtime_first_2hrs;
                const overtimeAfter2 = Math.max(0, overtimeHours - 2) * rates.base * rates.overtime_after_2hrs;
                const overtimePay = overtimeFirst2 + overtimeAfter2;
                
                const weekendPay = (timesheet.total_weekend_hours || 0) * rates.base * rates.saturday;
                const publicHolidayPay = (timesheet.total_public_holiday_hours || 0) * rates.base * rates.public_holiday;
                
                const grossPay = ordinaryPay + overtimePay + weekendPay + publicHolidayPay;
                
                // Calculate tax (simplified - use actual ATO tax tables in production)
                const annualizedIncome = grossPay * 26; // Fortnightly to annual
                let taxWithheld = 0;
                
                for (let i = 0; i < TAX_RATES.length; i++) {
                    if (annualizedIncome > TAX_RATES[i].threshold) {
                        const prevThreshold = i > 0 ? TAX_RATES[i-1].threshold : 0;
                        const taxableIncome = Math.min(
                            annualizedIncome - TAX_RATES[i].threshold,
                            TAX_RATES[i].threshold - prevThreshold
                        );
                        taxWithheld += taxableIncome * TAX_RATES[i].rate;
                    }
                }
                taxWithheld = taxWithheld / 26; // Convert back to fortnightly
                
                // Calculate superannuation
                const superannuation = grossPay * SUPER_RATE;
                
                // Calculate net pay
                const netPay = grossPay - taxWithheld;
                
                // Create payroll line item
                const lineItem = await base44.asServiceRole.entities.PayrollLineItem.create({
                    payroll_run_id: payrollRun.id,
                    practitioner_id: timesheet.practitioner_id,
                    practitioner_name: timesheet.practitioner_name,
                    timesheet_id: timesheet.id,
                    ordinary_hours: timesheet.total_ordinary_hours || 0,
                    ordinary_rate: rates.base,
                    ordinary_pay: ordinaryPay,
                    overtime_hours: overtimeHours,
                    overtime_rate: rates.base * rates.overtime_first_2hrs,
                    overtime_pay: overtimePay,
                    weekend_hours: timesheet.total_weekend_hours || 0,
                    weekend_rate: rates.base * rates.saturday,
                    weekend_pay: weekendPay,
                    public_holiday_hours: timesheet.total_public_holiday_hours || 0,
                    public_holiday_rate: rates.base * rates.public_holiday,
                    public_holiday_pay: publicHolidayPay,
                    allowances: 0,
                    gross_pay: grossPay,
                    tax_withheld: taxWithheld,
                    superannuation: superannuation,
                    deductions: 0,
                    net_pay: netPay,
                    award_classification: awardLevel
                });
                
                lineItems.push(lineItem);
                totalGross += grossPay;
                totalTax += taxWithheld;
                totalSuper += superannuation;
                totalNet += netPay;
                
                // Mark timesheet as processed
                await base44.entities.Timesheet.update(timesheet.id, {
                    status: 'processed'
                });
                
            } catch (error) {
                logger.error('Failed to process timesheet', error, {
                    timesheet_id: timesheet.id
                });
            }
        }
        
        // Update payroll run with totals
        await base44.entities.PayrollRun.update(payrollRun.id, {
            status: 'ready_for_approval',
            total_gross_pay: totalGross,
            total_tax_withheld: totalTax,
            total_superannuation: totalSuper,
            total_net_pay: totalNet
        });
        
        logger.audit('payroll_calculated', {
            payroll_run_id: payrollRun.id,
            employee_count: lineItems.length,
            total_gross: totalGross,
            total_net: totalNet
        });
        
        return Response.json({
            success: true,
            payroll_run_id: payrollRun.id,
            summary: {
                employees: lineItems.length,
                total_gross_pay: totalGross.toFixed(2),
                total_tax_withheld: totalTax.toFixed(2),
                total_superannuation: totalSuper.toFixed(2),
                total_net_pay: totalNet.toFixed(2)
            },
            line_items: lineItems.map(li => ({
                practitioner: li.practitioner_name,
                gross: li.gross_pay,
                net: li.net_pay
            }))
        });
        
    } catch (error) {
        logger.error('Payroll processing failed', error);
        
        return Response.json({
            error: 'Payroll processing failed',
            message: error.message
        }, { status: 500 });
    }
});