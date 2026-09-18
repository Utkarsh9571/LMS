import crypto from 'node:crypto';
import { GetSignedUploadUrlResult, IStorageProvider } from './storage-provider.interface';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export interface S3StorageConfig {
  endpoint?: string;               // e.g., 'https://<account_id>.r2.cloudflarestorage.com' or custom MinIO
  region: string;                 // e.g., 'us-east-1' or 'auto'
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  forcePathStyle?: boolean;       // true for MinIO/path-style, false for virtual-hosted
}

/**
 * Production S3-Compatible Storage Provider
 * Supports AWS S3, Cloudflare R2, DigitalOcean Spaces, and MinIO endpoints.
 * Implements AWS Signature Version 4 for presigned PUT (upload) and GET (read) URLs using native Node crypto.
 */
export class S3StorageProvider implements IStorageProvider {
  readonly providerName = 's3';

  private readonly config: S3StorageConfig;

  constructor(config: S3StorageConfig) {
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      throw new ApplicationError('Invalid S3 Storage Provider configuration: Missing required credentials or bucket name.');
    }
    this.config = {
      ...config,
      region: config.region || 'us-east-1'
    };
  }

  /**
   * Generates a presigned PUT upload URL using AWS Signature V4
   */
  async getSignedUploadUrl(
    key: string,
    mimeType: string,
    _isPublic?: boolean
  ): Promise<GetSignedUploadUrlResult> {
    const expiresInSeconds = 900; // 15-minute upload window
    const uploadUrl = this.generatePresignedUrl('PUT', key, expiresInSeconds, mimeType);
    const fileUrl = this.getObjectUrl(key);

    return {
      uploadUrl,
      fileUrl,
      fields: {
        'Content-Type': mimeType
      }
    };
  }

  /**
   * Generates a presigned GET read URL using AWS Signature V4
   */
  async getReadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.generatePresignedUrl('GET', key, expiresInSeconds);
  }

  /**
   * Deletes an object from S3/R2 storage via HTTP DELETE with SigV4 auth
   */
  async deleteObject(key: string): Promise<void> {
    const url = this.generatePresignedUrl('DELETE', key, 60);
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        logger.error('[S3StorageProvider] Delete object failed', { status: res.status });
        throw new ApplicationError(`Failed to delete object from storage provider (HTTP ${res.status}).`);
      }
      logger.info('[S3StorageProvider] Deleted object', { bucket: this.config.bucketName });
    } catch (err: any) {
      if (err instanceof ApplicationError) throw err;
      logger.error('[S3StorageProvider] Network error during object deletion', { error: err.message });
      throw new ApplicationError('Storage provider request failed.');
    }
  }

  /**
   * Generates AWS SigV4 Presigned Query URL
   */
  private generatePresignedUrl(
    method: 'PUT' | 'GET' | 'DELETE',
    key: string,
    expiresInSeconds: number,
    contentType?: string
  ): string {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const datestamp = amzDate.substring(0, 8); // YYYYMMDD
    const service = 's3';
    const region = this.config.region;
    const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

    const host = this.getHost();
    const path = this.getPath(key);

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresInSeconds.toString(),
      'X-Amz-SignedHeaders': contentType ? 'content-type;host' : 'host'
    };

    const sortedQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const headers: Record<string, string> = {
      host
    };
    if (contentType) {
      headers['content-type'] = contentType;
    }

    const sortedHeaderNames = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k}:${headers[k].trim()}\n`)
      .join('');

    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      method,
      path,
      sortedQueryString,
      canonicalHeaders,
      sortedHeaderNames,
      payloadHash
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.hashHex(canonicalRequest)
    ].join('\n');

    const signingKey = this.getSigningKey(this.config.secretAccessKey, datestamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const scheme = this.config.endpoint && this.config.endpoint.startsWith('http://') ? 'http' : 'https';
    return `${scheme}://${host}${path}?${sortedQueryString}&X-Amz-Signature=${signature}`;
  }

  private getHost(): string {
    if (this.config.endpoint) {
      return this.config.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    if (this.config.forcePathStyle) {
      return `s3.${this.config.region}.amazonaws.com`;
    }
    return `${this.config.bucketName}.s3.${this.config.region}.amazonaws.com`;
  }

  private getPath(key: string): string {
    const sanitizedKey = key.startsWith('/') ? key : `/${key}`;
    if (this.config.endpoint || this.config.forcePathStyle) {
      return `/${this.config.bucketName}${sanitizedKey}`;
    }
    return sanitizedKey;
  }

  private getObjectUrl(key: string): string {
    const scheme = this.config.endpoint && this.config.endpoint.startsWith('http://') ? 'http' : 'https';
    const host = this.getHost();
    const path = this.getPath(key);
    return `${scheme}://${host}${path}`;
  }

  private hashHex(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private getSigningKey(secretKey: string, date: string, region: string, service: string): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  }
}
