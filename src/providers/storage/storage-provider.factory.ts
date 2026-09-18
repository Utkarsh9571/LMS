import { IStorageProvider } from './storage-provider.interface';
import { MockStorageProvider } from './mock-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export class StorageProviderFactory {
  private static mockProvider = new MockStorageProvider();
  private static s3Provider?: S3StorageProvider;

  static getProvider(providerType?: string): IStorageProvider {
    const rawType = providerType || (config.providers.useMockStorage ? 'mock' : config.providers.storage.provider);
    const targetType = rawType?.toLowerCase().trim();

    if (targetType === 'mock' || (config.providers.useMockStorage && !providerType)) {
      return this.mockProvider;
    }

    if (targetType === 's3') {
      if (!this.s3Provider) {
        const { endpoint, region, accessKeyId, secretAccessKey, bucketName, forcePathStyle } =
          config.providers.storage;

        if (!accessKeyId || !secretAccessKey || !bucketName) {
          throw new ApplicationError(
            '[StorageProviderFactory] Production S3 storage requested but missing required environment variables (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, or S3_BUCKET_NAME).'
          );
        }

        logger.info('[StorageProviderFactory] Initializing production S3 storage provider', {
          bucketName,
          region,
          hasEndpoint: Boolean(endpoint)
        });

        this.s3Provider = new S3StorageProvider({
          endpoint,
          region,
          accessKeyId,
          secretAccessKey,
          bucketName,
          forcePathStyle
        });
      }

      return this.s3Provider;
    }

    // Explicit unsupported/unknown provider must throw ApplicationError (never silently return mock)
    throw new ApplicationError(
      `[StorageProviderFactory] Unsupported or invalid storage provider: '${providerType || targetType}'.`
    );
  }
}
