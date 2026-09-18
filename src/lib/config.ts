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
    useMockStorage: boolean;
    useMockNotification: boolean;
    storage: {
      provider: 's3' | 'mock';
      endpoint?: string;
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      bucketName?: string;
      forcePathStyle: boolean;
    };
    meeting: {
      provider: string;
      accountId?: string;
      clientId?: string;
      clientSecret?: string;
    };
    notification: {
      provider: string;
      fromEmail: string;
      apiKey?: string;
      apiEndpoint?: string;
    };
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
    useMockPayment: process.env.USE_MOCK_PAYMENT === 'true' || (process.env.USE_MOCK_PAYMENT !== 'false' && nodeEnv === 'development'),
    useMockMeeting: process.env.USE_MOCK_MEETING === 'true' || (process.env.USE_MOCK_MEETING !== 'false' && nodeEnv === 'development'),
    useMockStorage: process.env.USE_MOCK_STORAGE === 'true' || (process.env.USE_MOCK_STORAGE !== 'false' && nodeEnv === 'development'),
    useMockNotification: process.env.USE_MOCK_NOTIFICATION === 'true' || (process.env.USE_MOCK_NOTIFICATION !== 'false' && nodeEnv === 'development'),
    storage: {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'mock') || 'mock',
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucketName: process.env.S3_BUCKET_NAME,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
    },
    meeting: {
      provider: process.env.MEETING_PROVIDER || 'mock',
      accountId: process.env.ZOOM_ACCOUNT_ID,
      clientId: process.env.ZOOM_CLIENT_ID,
      clientSecret: process.env.ZOOM_CLIENT_SECRET
    },
    notification: {
      provider: process.env.NOTIFICATION_PROVIDER || 'mock',
      fromEmail: process.env.EMAIL_FROM || 'noreply@bimacademy.com',
      apiKey: process.env.EMAIL_API_KEY,
      apiEndpoint: process.env.EMAIL_API_ENDPOINT
    }
  },
  markets: {
    SG: {
      code: 'SG',
      name: 'Singapore',
      currency: 'SGD',
      currencyMinorUnits: 2,
      timezone: 'Asia/Singapore',
      locale: 'en-SG',
      domains: ['sg.bimacademy.com', 'sg.localhost']
    },
    MY: {
      code: 'MY',
      name: 'Malaysia',
      currency: 'MYR',
      currencyMinorUnits: 2,
      timezone: 'Asia/Kuala_Lumpur',
      locale: 'en-MY',
      domains: ['my.bimacademy.com', 'my.localhost']
    }
  }
};
