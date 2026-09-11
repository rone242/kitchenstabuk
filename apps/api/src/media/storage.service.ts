import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StoredFile {
  key: string;
  publicUrl: string;
  provider: 'LOCAL' | 'S3' | 'R2';
}

@Injectable()
export class StorageService {
  private readonly provider: 'local' | 's3' | 'r2';
  private readonly localDirectory: string;
  private readonly bucket?: string;
  private readonly publicUrl?: string;
  private readonly s3?: S3Client;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<'local' | 's3' | 'r2'>('UPLOAD_PROVIDER', 'local');
    this.localDirectory = resolve(
      process.cwd(),
      config.get<string>('UPLOAD_LOCAL_DIR', 'uploads'),
    );
    this.bucket = config.get<string>('STORAGE_BUCKET');
    this.publicUrl = config.get<string>('STORAGE_PUBLIC_URL')?.replace(/\/$/, '');
    if (this.provider !== 'local') {
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

  async put(buffer: Buffer, extension: string, contentType: string): Promise<StoredFile> {
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

  async delete(key: string, provider: 'LOCAL' | 'S3' | 'R2'): Promise<void> {
    if (provider === 'LOCAL') {
      await unlink(resolve(this.localDirectory, key)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      return;
    }
    await this.s3?.send(new DeleteObjectCommand({ Bucket: this.bucket!, Key: key }));
  }
}
