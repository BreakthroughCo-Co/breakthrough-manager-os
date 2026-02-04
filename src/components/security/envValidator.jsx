/**
 * Environment Variable Validator
 * 
 * Critical for operational safety and audit readiness.
 * Fails fast on startup if required configuration is missing.
 * 
 * NDIS Compliance Note:
 * Proper configuration validation prevents undefined system states
 * that could lead to compliance issues or data integrity problems.
 */

const REQUIRED_ENV_VARS = [
  'VITE_BASE44_APP_BASE_URL'
];

const OPTIONAL_ENV_VARS = [
  'VITE_BASE44_APP_ID',
  'VITE_ENVIRONMENT'
];

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required variable is missing
 */
export function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional but recommended variables
  OPTIONAL_ENV_VARS.forEach(varName => {
    if (!import.meta.env[varName]) {
      warnings.push(varName);
    }
  });

  // Fail fast if required variables are missing
  if (missing.length > 0) {
    const errorMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CONFIGURATION ERROR - APPLICATION CANNOT START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing required environment variables:
${missing.map(v => `  ❌ ${v}`).join('\n')}

Required actions:
1. Copy .env.example to .env
2. Configure all required variables
3. Restart the development server

For production deployment, ensure all variables are set in your hosting environment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    console.error(errorMessage);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Log warnings for optional variables
  if (warnings.length > 0 && import.meta.env.DEV) {
    console.warn('⚠️  Optional environment variables not set:', warnings.join(', '));
  }

  // Log successful validation in development
  if (import.meta.env.DEV) {
    console.log('✅ Environment configuration validated successfully');
  }
}

/**
 * Gets an environment variable with type safety
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Optional default value
 * @returns {string} The environment variable value
 */
export function getEnvVar(key, defaultValue = '') {
  const value = import.meta.env[key];
  if (value === undefined && !defaultValue) {
    console.warn(`Environment variable ${key} is not set and no default provided`);
  }
  return value || defaultValue;
}