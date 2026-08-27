import { ServiceBusClient } from '@azure/service-bus';
import type { ServiceBusModuleOptions } from './service-bus.types.js';

export async function createServiceBusClient(options: ServiceBusModuleOptions): Promise<ServiceBusClient> {
	const configuredConnections = [options.client, options.connectionString, options.fullyQualifiedNamespace].filter(
		Boolean,
	);

	if (configuredConnections.length !== 1) {
		throw new Error('ServiceBusModule requires exactly one of client, connectionString or fullyQualifiedNamespace');
	}

	if (options.client) {
		return options.client;
	}

	if (options.connectionString) {
		return new ServiceBusClient(options.connectionString, options.clientOptions);
	}

	const credential = options.credential ?? new (await import('@azure/identity')).DefaultAzureCredential();
	return new ServiceBusClient(options.fullyQualifiedNamespace as string, credential, options.clientOptions);
}
