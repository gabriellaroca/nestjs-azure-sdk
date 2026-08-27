import type { TokenCredential } from '@azure/core-auth';
import type {
	BlobServiceClient,
	BlockBlobParallelUploadOptions,
	BlockBlobUploadStreamOptions,
} from '@azure/storage-blob';
import type { AzureModuleAsyncOptions } from '../common/module-options.js';

export interface BlobStorageModuleOptions {
	accountName?: string;
	client?: BlobServiceClient;
	connectionString?: string;
	credential?: TokenCredential;
	isGlobal?: boolean;
	serviceUrl?: string;
}

export type BlobStorageModuleAsyncOptions = AzureModuleAsyncOptions<BlobStorageModuleOptions>;

export interface BlobUploadOptions extends BlockBlobParallelUploadOptions {
	createContainerIfNotExists?: boolean;
}

export interface BlobStreamUploadOptions extends BlockBlobUploadStreamOptions {
	bufferSize?: number;
	createContainerIfNotExists?: boolean;
	maxConcurrency?: number;
}

export interface BlobFileUploadOptions extends BlockBlobParallelUploadOptions {
	createContainerIfNotExists?: boolean;
}
