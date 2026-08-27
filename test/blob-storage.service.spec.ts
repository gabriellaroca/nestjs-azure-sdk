import { Readable } from 'node:stream';
import { jest } from '@jest/globals';
import type { BlobServiceClient } from '@azure/storage-blob';
import { BlobStorageService } from '../src/blob-storage/blob-storage.service.js';

describe('BlobStorageService', () => {
	function setup() {
		const blockBlob = {
			uploadData: jest.fn<() => Promise<object>>().mockResolvedValue({ etag: 'etag' }),
			uploadFile: jest.fn<() => Promise<object>>().mockResolvedValue({ etag: 'etag' }),
			uploadStream: jest.fn<() => Promise<object>>().mockResolvedValue({ etag: 'etag' }),
		};
		const blob = {
			deleteIfExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
			download: jest
				.fn<() => Promise<object>>()
				.mockResolvedValue({ readableStreamBody: Readable.from('value') }),
			downloadToBuffer: jest.fn<() => Promise<Buffer>>().mockResolvedValue(Buffer.from('{"id":1}')),
			exists: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
		};
		const container = {
			createIfNotExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
			deleteIfExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
			getBlobClient: jest.fn(() => blob),
			getBlockBlobClient: jest.fn(() => blockBlob),
			listBlobsFlat: jest.fn(() => ({ [Symbol.asyncIterator]: async function* () {} })),
		};
		const client = {
			getContainerClient: jest.fn(() => container),
		} as unknown as BlobServiceClient;

		return { blob, blockBlob, client, container, service: new BlobStorageService(client) };
	}

	it('uploads JSON with content type and creates the container when requested', async () => {
		const { blockBlob, container, service } = setup();

		await service.uploadJson('documents', 'order.json', { id: 1 }, { createContainerIfNotExists: true });

		expect(container.createIfNotExists).toHaveBeenCalledTimes(1);
		const [content, options] = blockBlob.uploadData.mock.calls[0] as unknown as [Buffer, Record<string, unknown>];
		expect(content.toString()).toBe('{"id":1}');
		expect(options).toEqual({
			blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
		});
	});

	it('supports streams, files and typed JSON downloads', async () => {
		const { blockBlob, service } = setup();
		const stream = Readable.from('large file');

		await service.uploadStream('documents', 'large.bin', stream, {
			bufferSize: 1024,
			maxConcurrency: 2,
		});
		await service.uploadFile('documents', 'local.bin', '/tmp/local.bin');
		const value = await service.downloadJson<{ id: number }>('documents', 'order.json');

		expect(blockBlob.uploadStream).toHaveBeenCalledWith(stream, 1024, 2, {});
		expect(blockBlob.uploadFile).toHaveBeenCalledWith('/tmp/local.bin', {});
		expect(value).toEqual({ id: 1 });
	});

	it('deletes snapshots together with a blob', async () => {
		const { blob, service } = setup();

		await service.delete('documents', 'old.bin');

		expect(blob.deleteIfExists).toHaveBeenCalledWith({ deleteSnapshots: 'include' });
	});
});
