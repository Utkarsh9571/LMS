import { IPaymentProvider } from './payment-provider.interface';
import { MockPaymentProvider } from './mock-payment.provider';
import { HitPayProvider } from './hitpay.provider';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

export interface ResolvedProviderCredentials {
  provider: IPaymentProvider;
  apiKey?: string;
  secretSalt?: string;
}

/**
 * Payment Provider Factory
 * Resolves appropriate payment provider without persisting credentials in MongoDB.
 * Database stores only configuration references (e.g. "HITPAY_SG"), which are mapped to process.env.
 */
export class PaymentProviderFactory {
  private static mockProvider = new MockPaymentProvider();
  private static hitpayProvider = new HitPayProvider();

  static getProvider(
    providerType: 'hitpay' | 'mock',
    paymentConfigurationRef?: string,
    options?: { forceType?: boolean }
  ): ResolvedProviderCredentials {
    // If provider is explicitly 'mock' or mock mode is forced without forceType override
    if (providerType === 'mock' || (!options?.forceType && config.providers.useMockPayment)) {
      return {
        provider: this.mockProvider
      };
    }


    if (providerType === 'hitpay') {
      const configRef = paymentConfigurationRef || 'HITPAY_SG';
      const apiKey = process.env[`${configRef}_API_KEY`];
      const secretSalt = process.env[`${configRef}_SALT`];

      logger.info('[PaymentProviderFactory] Resolved HitPay provider for configRef', {
        configRef,
        hasApiKey: Boolean(apiKey),
        hasSalt: Boolean(secretSalt)
      });

      return {
        provider: this.hitpayProvider,
        apiKey,
        secretSalt
      };
    }

    // Default fallback to mock provider for safe development
    return {
      provider: this.mockProvider
    };
  }
}
