import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface MediaStorageConfig {
  endpoint: string;
  publicEndpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
}

export class MediaStorage {
  private readonly client: S3Client;
  private readonly signer: S3Client;

  constructor(private readonly config: MediaStorageConfig) {
    const credentials = { accessKeyId: config.accessKey, secretAccessKey: config.secretKey };
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials,
    });
    this.signer = new S3Client({
      region: config.region,
      endpoint: config.publicEndpoint,
      forcePathStyle: true,
      credentials,
    });
  }

  async upload(objectKey: string, body: Uint8Array, contentType: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=3600',
    }));
  }

  async remove(objectKey: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
  }

  async signedReadUrl(objectKey: string) {
    return getSignedUrl(this.signer, new GetObjectCommand({ Bucket: this.config.bucket, Key: objectKey }), { expiresIn: 3600 });
  }
}

export function createMediaStorage(config: MediaStorageConfig | null) {
  return config ? new MediaStorage(config) : null;
}
