import { GetSignedUploadUrlResult, IStorageProvider } from './storage-provider.interface';
import { logger } from '@/lib/logger';

export class MockStorageProvider implements IStorageProvider {
  readonly providerName = 'mock';
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000/storage/mock') {
    this.baseUrl = baseUrl;
  }

  async getSignedUploadUrl(
    key: string,
    mimeType: string,
    _isPublic?: boolean
  ): Promise<GetSignedUploadUrlResult> {
    const uploadUrl = `${this.baseUrl}/upload?key=${encodeURIComponent(key)}&mime=${encodeURIComponent(mimeType)}`;
    const fileUrl = `${this.baseUrl}/files/${key}`;

    logger.info('[MockStorageProvider] Generated mock signed upload URL', {
      key,
      mimeType,
      uploadUrl
    });

    return {
      uploadUrl,
      fileUrl,
      fields: {
        'Content-Type': mimeType,
        'x-amz-key': key
      }
    };
  }

  async getReadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return `${this.baseUrl}/files/${key}?expires=${expiresInSeconds}`;
  }

  async deleteObject(key: string): Promise<void> {
    logger.info('[MockStorageProvider] Mock deleted object', { key });
  }
}
