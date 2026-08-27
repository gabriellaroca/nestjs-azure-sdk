import { QueueServiceClient } from '@azure/storage-queue';
import type { QueueStorageModuleOptions } from './queue-storage.types.js';

export async function createQueueServiceClient(options: QueueStorageModuleOptions): Promise<QueueServiceClient> {
	const endpoint =
		options.serviceUrl ??
		(options.accountName ? `https://${options.accountName}.queue.core.windows.net` : undefined);
	const configuredConnections = [options.client, options.connectionString, endpoint].filter(Boolean);

	if (configuredConnections.length !== 1) {
		throw new Error(
			'QueueStorageModule requires exactly one of client, connectionString, serviceUrl or accountName',
		);
	}

	if (options.client) {
		return options.client;
	}

	if (options.connectionString) {
		return QueueServiceClient.fromConnectionString(options.connectionString);
	}

	const credential = options.credential ?? new (await import('@azure/identity')).DefaultAzureCredential();
	return new QueueServiceClient(endpoint as string, credential);
}
