import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StoredFile {
  key: string;
  publicUrl: string;
  provider: 'LOCAL' | 'S3' | 'R2' | 'CLOUDINARY';
}

@Injectable()
export class StorageService {
  private readonly provider: 'local' | 's3' | 'r2' | 'cloudinary';
  private readonly localDirectory: string;
  private readonly bucket?: string;
  private readonly publicUrl?: string;
  private readonly s3?: S3Client;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<'local' | 's3' | 'r2' | 'cloudinary'>(
      'UPLOAD_PROVIDER',
      'local',
    );
    this.localDirectory = resolve(
      process.cwd(),
      config.get<string>('UPLOAD_LOCAL_DIR', 'uploads'),
    );
    this.bucket = config.get<string>('STORAGE_BUCKET');
    this.publicUrl = config
      .get<string>('STORAGE_PUBLIC_URL')
      ?.replace(/\/$/, '');
    if (this.provider === 's3' || this.provider === 'r2') {
      const accessKeyId = config.get<string>('STORAGE_ACCESS_KEY_ID');
      const secretAccessKey = config.get<string>('STORAGE_SECRET_ACCESS_KEY');
      this.s3 = new S3Client({
        endpoint: config.get<string>('STORAGE_ENDPOINT'),
        region: config.get<string>('STORAGE_REGION', 'auto'),
        forcePathStyle: this.provider === 's3',
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
      });
    }
  }

  async put(
    buffer: Buffer,
    extension: string,
    contentType: string,
  ): Promise<StoredFile> {
    if (this.provider === 'cloudinary') {
      const publicId = `${this.config.get<string>('CLOUDINARY_FOLDER', 'kitchenstabuk')}/${randomUUID()}`;
      const form = this.cloudinaryForm({
        public_id: publicId,
        overwrite: 'false',
      });
      form.set(
        'file',
        new Blob([new Uint8Array(buffer)], { type: contentType }),
        `${randomUUID()}.${extension}`,
      );
      const result = await this.cloudinaryRequest('upload', form);
      if (
        typeof result.public_id !== 'string' ||
        typeof result.secure_url !== 'string' ||
        !result.secure_url.startsWith('https://')
      ) {
        throw new BadGatewayException(
          'Cloudinary returned an invalid upload response',
        );
      }
      return {
        key: result.public_id,
        publicUrl: result.secure_url,
        provider: 'CLOUDINARY',
      };
    }
    const date = new Date();
    const key = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`;
    if (this.provider === 'local') {
      const path = resolve(this.localDirectory, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buffer, { flag: 'wx' });
      return {
        key,
        publicUrl: `${this.config.get<string>('API_ORIGIN', 'http://localhost:4000')}/uploads/${key}`,
        provider: 'LOCAL',
      };
    }

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return {
      key,
      publicUrl: `${this.publicUrl}/${key}`,
      provider: this.provider === 'r2' ? 'R2' : 'S3',
    };
  }

  async delete(
    key: string,
    provider: 'LOCAL' | 'S3' | 'R2' | 'CLOUDINARY',
  ): Promise<void> {
    if (provider === 'CLOUDINARY') {
      const result = await this.cloudinaryRequest(
        'destroy',
        this.cloudinaryForm({ public_id: key, invalidate: 'true' }),
      );
      if (result.result !== 'ok' && result.result !== 'not found')
        throw new BadGatewayException('Cloudinary could not delete the image');
      return;
    }
    if (provider === 'LOCAL') {
      await unlink(resolve(this.localDirectory, key)).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error;
        },
      );
      return;
    }
    await this.s3?.send(
      new DeleteObjectCommand({ Bucket: this.bucket!, Key: key }),
    );
  }
  private cloudinaryForm(parameters: Record<string, string>): FormData {
    const values = {
      ...parameters,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const secret = this.config.getOrThrow<string>('CLOUDINARY_API_SECRET');
    const signature = createHash('sha256')
      .update(
        Object.entries(values)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('&') + secret,
      )
      .digest('hex');
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    form.set('api_key', this.config.getOrThrow<string>('CLOUDINARY_API_KEY'));
    form.set('signature', signature);
    return form;
  }

  private async cloudinaryRequest(
    action: 'upload' | 'destroy',
    body: FormData,
  ): Promise<Record<string, unknown>> {
    const cloud = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/${action}`,
        {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(60000),
        },
      );
      if (!response.ok) throw new Error('Cloudinary request failed');
      return (await response.json()) as Record<string, unknown>;
    } catch {
      throw new BadGatewayException(
        'Cloudinary is unavailable. Check storage configuration and try again.',
      );
    }
  }
}
