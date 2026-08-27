import type { Readable } from 'node:stream';
import type {
	BlobDeleteIfExistsResponse,
	BlobDownloadOptions,
	BlobDownloadResponseParsed,
	BlobItem,
	BlobServiceClient,
	BlobUploadCommonResponse,
	ContainerCreateOptions,
	ContainerCreateIfNotExistsResponse,
	ContainerDeleteIfExistsResponse,
	ContainerListBlobsOptions,
} from '@azure/storage-blob';
import { Inject, Injectable } from '@nestjs/common';
import { BLOB_SERVICE_CLIENT } from './blob-storage.constants.js';
import type { BlobFileUploadOptions, BlobStreamUploadOptions, BlobUploadOptions } from './blob-storage.types.js';

@Injectable()
export class BlobStorageService {
	constructor(@Inject(BLOB_SERVICE_CLIENT) private readonly client: BlobServiceClient) {}

	getClient(): BlobServiceClient {
		return this.client;
	}

	getContainerClient(container: string) {
		return this.client.getContainerClient(container);
	}

	getBlobClient(container: string, blob: string) {
		return this.getContainerClient(container).getBlobClient(blob);
	}

	async createContainer(
		container: string,
		options: ContainerCreateOptions = {},
	): Promise<ContainerCreateIfNotExistsResponse> {
		return this.getContainerClient(container).createIfNotExists(options);
	}

	async deleteContainer(container: string): Promise<ContainerDeleteIfExistsResponse> {
		return this.getContainerClient(container).deleteIfExists();
	}

	async upload(
		container: string,
		blob: string,
		data: string | Buffer | Uint8Array,
		options: BlobUploadOptions = {},
	): Promise<BlobUploadCommonResponse> {
		const { createContainerIfNotExists, ...uploadOptions } = options;
		const containerClient = this.getContainerClient(container);
		if (createContainerIfNotExists) {
			await containerClient.createIfNotExists();
		}

		const content = typeof data === 'string' ? Buffer.from(data) : data;
		return containerClient.getBlockBlobClient(blob).uploadData(content, uploadOptions);
	}

	async uploadJson<T>(
		container: string,
		blob: string,
		value: T,
		options: BlobUploadOptions = {},
	): Promise<BlobUploadCommonResponse> {
		return this.upload(container, blob, Buffer.from(JSON.stringify(value)), {
			...options,
			blobHTTPHeaders: {
				...options.blobHTTPHeaders,
				blobContentType: options.blobHTTPHeaders?.blobContentType ?? 'application/json; charset=utf-8',
			},
		});
	}

	async uploadStream(
		container: string,
		blob: string,
		stream: Readable,
		options: BlobStreamUploadOptions = {},
	): Promise<BlobUploadCommonResponse> {
		const { bufferSize, createContainerIfNotExists, maxConcurrency, ...uploadOptions } = options;
		const containerClient = this.getContainerClient(container);
		if (createContainerIfNotExists) {
			await containerClient.createIfNotExists();
		}

		return containerClient.getBlockBlobClient(blob).uploadStream(stream, bufferSize, maxConcurrency, uploadOptions);
	}

	async uploadFile(
		container: string,
		blob: string,
		filePath: string,
		options: BlobFileUploadOptions = {},
	): Promise<BlobUploadCommonResponse> {
		const { createContainerIfNotExists, ...uploadOptions } = options;
		const containerClient = this.getContainerClient(container);
		if (createContainerIfNotExists) {
			await containerClient.createIfNotExists();
		}

		return containerClient.getBlockBlobClient(blob).uploadFile(filePath, uploadOptions);
	}

	async download(container: string, blob: string): Promise<Buffer> {
		return this.getBlobClient(container, blob).downloadToBuffer();
	}

	async downloadJson<T>(container: string, blob: string): Promise<T> {
		const content = await this.download(container, blob);
		return JSON.parse(content.toString('utf8')) as T;
	}

	async downloadStream(
		container: string,
		blob: string,
		options: BlobDownloadOptions = {},
	): Promise<BlobDownloadResponseParsed> {
		return this.getBlobClient(container, blob).download(0, undefined, options);
	}

	async exists(container: string, blob: string): Promise<boolean> {
		return this.getBlobClient(container, blob).exists();
	}

	async delete(container: string, blob: string): Promise<BlobDeleteIfExistsResponse> {
		return this.getBlobClient(container, blob).deleteIfExists({ deleteSnapshots: 'include' });
	}

	list(container: string, options: ContainerListBlobsOptions = {}): AsyncIterable<BlobItem> {
		return this.getContainerClient(container).listBlobsFlat(options);
	}
}
