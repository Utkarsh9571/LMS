/**
 * Centralized, Typed Server-Side Application Configuration
 * 
 * Strict invariants:
 * - Server-side only (never imported in client bundles)
 * - Safe validation of required variables
 * - Fallbacks for mock providers during development
 * - No secrets leaked to logs or client
 */

export interface MarketConfig {
  code: 'SG' | 'MY';
  name: string;
  currency: 'SGD' | 'MYR';
  currencyMinorUnits: number;
  timezone: string;
  locale: string;
  domains: string[];
}

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  isProduction: boolean;
  isDevelopment: boolean;
  database: {
    uri: string;
  };
  security: {
    sessionSecret: string;
  };
  providers: {
    useMockPayment: boolean;
    useMockMeeting: boolean;
  };
  markets: Record<'SG' | 'MY', MarketConfig>;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`[Config Error] Missing required environment variable: ${key}`);
  }
  return value;
}

const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

export const config: AppConfig = {
  env: nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  database: {
    uri: getEnvVar('MONGODB_URI', 'mongodb://127.0.0.1:27017/lms')
  },
  security: {
    sessionSecret: getEnvVar('SESSION_SECRET', 'dev_default_session_secret_for_development_purposes_only')
  },
  providers: {
    useMockPayment: process.env.USE_MOCK_PAYMENT === 'true' || nodeEnv === 'development',
    useMockMeeting: process.env.USE_MOCK_MEETING === 'true' || nodeEnv === 'development'
  },
  markets: {
    SG: {
      code: 'SG',
      name: 'Singapore',
      currency: 'SGD',
      currencyMinorUnits: 2,
      timezone: 'Asia/Singapore',
      locale: 'en-SG'
    },
    MY: {
      code: 'MY',
      name: 'Malaysia',
      currency: 'MYR',
      currencyMinorUnits: 2,
      timezone: 'Asia/Kuala_Lumpur',
      locale: 'en-MY'
    }
  }
};
