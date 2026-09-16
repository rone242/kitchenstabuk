import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service.js';

const config = {
  UPLOAD_PROVIDER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
  CLOUDINARY_FOLDER: 'test-folder',
};
describe('Cloudinary storage', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('signs uploads on the server and stores the secure CDN URL and public ID', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            public_id: 'test-folder/image',
            secure_url:
              'https://res.cloudinary.com/test-cloud/image/upload/image.png',
          }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const service = new StorageService(new ConfigService(config));
    const stored = await service.put(
      Buffer.from('image-bytes'),
      'png',
      'image/png',
    );
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    const body = options.body as FormData;
    const expected = createHash('sha256')
      .update(
        `overwrite=false&public_id=${body.get('public_id')}&timestamp=${body.get('timestamp')}test-secret`,
      )
      .digest('hex');
    expect(body.get('signature')).toBe(expected);
    expect(body.get('api_key')).toBe('test-key');
    expect(body.has('api_secret')).toBe(false);
    expect(await (body.get('file') as Blob).text()).toBe('image-bytes');
    expect(stored).toEqual({
      key: 'test-folder/image',
      publicUrl: 'https://res.cloudinary.com/test-cloud/image/upload/image.png',
      provider: 'CLOUDINARY',
    });
  });
  it('deletes by public ID with CDN invalidation, even when another upload provider is selected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ result: 'ok' })));
    vi.stubGlobal('fetch', fetchMock);
    const service = new StorageService(
      new ConfigService({ ...config, UPLOAD_PROVIDER: 'local' }),
    );
    await service.delete('test-folder/image', 'CLOUDINARY');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/image\/destroy$/);
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('public_id')).toBe('test-folder/image');
    expect(body.get('invalidate')).toBe('true');
  });
  it('reports upstream failures without exposing provider response details or secrets', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('private provider details', { status: 401 }),
        ),
    );
    await expect(
      new StorageService(new ConfigService(config)).put(
        Buffer.from('x'),
        'png',
        'image/png',
      ),
    ).rejects.toThrow('Cloudinary is unavailable');
  });
});
