import { connectToDatabase } from '@/lib/db';
import { MarketModel } from '@/core/domain/market.model';
import { UserModel } from '@/core/domain/user.model';
import { hashPassword } from '@/lib/password';
import { logger } from '@/lib/logger';

/**
 * Safe development seeder
 * Only runs in development environment and creates standard SG/MY markets and a test dev-admin.
 */
export async function seedDevelopmentData(): Promise<{ success: boolean; message: string }> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seeder cannot run in production environment.');
  }

  await connectToDatabase();

  // 1. Seed Markets if missing
  const markets = [
    {
      code: 'SG',
      name: 'Singapore',
      countryCode: 'SG',
      currency: 'SGD',
      currencyMinorUnits: 2,
      timezone: 'Asia/Singapore',
      domains: ['sg.bimacademy.com', 'sg.localhost'],
      locale: 'en-SG',
      status: 'active',
      paymentProvider: 'mock',
      paymentConfigurationRef: 'HITPAY_SG',
      supportedPaymentMethods: ['card', 'paynow']
    },
    {
      code: 'MY',
      name: 'Malaysia',
      countryCode: 'MY',
      currency: 'MYR',
      currencyMinorUnits: 2,
      timezone: 'Asia/Kuala_Lumpur',
      domains: ['my.bimacademy.com', 'my.localhost'],
      locale: 'en-MY',
      status: 'active',
      paymentProvider: 'mock',
      paymentConfigurationRef: 'HITPAY_MY',
      supportedPaymentMethods: ['card', 'fpx', 'duitnow']
    }
  ];

  for (const m of markets) {
    await MarketModel.updateOne({ code: m.code }, { $set: m }, { upsert: true });
  }

  // 2. Seed development admin user if not exists
  const devAdminEmail = 'dev.admin@bimacademy.local';
  const existingAdmin = await UserModel.findOne({ email: devAdminEmail });

  if (!existingAdmin) {
    // Development-only known password for testing
    const devPassword = process.env.DEV_SEED_PASSWORD || 'DevAdmin@123';
    const passwordHash = await hashPassword(devPassword);

    await UserModel.create({
      email: devAdminEmail,
      passwordHash,
      fullName: 'Development Admin',
      globalRoles: ['superadmin', 'admin'],
      status: 'active',
      lastActiveMarket: 'SG'
    });

    logger.info('Development admin seeded successfully', { email: devAdminEmail });
  }

  return { success: true, message: 'Development markets and admin seeded successfully.' };
}
