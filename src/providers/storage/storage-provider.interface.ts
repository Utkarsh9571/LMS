/**
 * Storage Provider Contract
 * Standard interface for binary/file storage (S3, Cloudflare R2, Cloudinary, Local Mock)
 */

export interface GetSignedUploadUrlResult {
  uploadUrl: string;
  fileUrl: string;
  fields?: Record<string, string>;
}

export interface IStorageProvider {
  readonly providerName: string;
  getSignedUploadUrl(key: string, mimeType: string, isPublic?: boolean): Promise<GetSignedUploadUrlResult>;
  getReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
