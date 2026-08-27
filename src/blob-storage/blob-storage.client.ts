import { BlobServiceClient } from '@azure/storage-blob';
import type { BlobStorageModuleOptions } from './blob-storage.types.js';

export async function createBlobServiceClient(options: BlobStorageModuleOptions): Promise<BlobServiceClient> {
	const endpoint =
		options.serviceUrl ??
		(options.accountName ? `https://${options.accountName}.blob.core.windows.net` : undefined);
	const configuredConnections = [options.client, options.connectionString, endpoint].filter(Boolean);

	if (configuredConnections.length !== 1) {
		throw new Error(
			'BlobStorageModule requires exactly one of client, connectionString, serviceUrl or accountName',
		);
	}

	if (options.client) {
		return options.client;
	}

	if (options.connectionString) {
		return BlobServiceClient.fromConnectionString(options.connectionString);
	}

	const credential = options.credential ?? new (await import('@azure/identity')).DefaultAzureCredential();
	return new BlobServiceClient(endpoint as string, credential);
}
