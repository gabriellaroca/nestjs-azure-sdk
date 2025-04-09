import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import { ClientOptions, ConnectionString, IdentityCredential } from '../type/client';

/**
 * Interface for a factory that creates instances of ServiceBusClient.
 * @interface
 */
export interface ServiceBusClientFactory {
	/**
	 * Creates a new instance of ServiceBusClient.
	 * @returns An instance of ServiceBusClient.
	 */
	createClient(): ServiceBusClient;
}

/**
 * Implementation of ServiceBusClientFactory for creating clients using a connection string.
 * @class
 */
class ConnectionStringServiceBusClientFactory implements ServiceBusClientFactory {
	/**
	 * Creates an instance of ConnectionStringServiceBusClientFactory.
	 * @constructor
	 * @param credentials The connection string credentials.
	 */
	constructor(private credentials: ConnectionString) {}

	/**
	 * Creates a ServiceBusClient instance using the provided connection string.
	 * @returns An instance of ServiceBusClient.
	 */
	createClient(): ServiceBusClient {
		return new ServiceBusClient(this.credentials.token);
	}
}

/**
 * Implementation of ServiceBusClientFactory for creating clients using identity credentials.
 * @class
 */
class IdentityCredentialServiceBusClientFactory implements ServiceBusClientFactory {
	/**
	 * Creates an instance of IdentityCredentialServiceBusClientFactory.
	 * @constructor
	 * @param credentials The identity credentials.
	 */
	constructor(private credentials: IdentityCredential) {}

	/**
	 * Creates a ServiceBusClient instance using the provided identity credentials.
	 * Uses DefaultAzureCredential for authentication.
	 * @returns An instance of ServiceBusClient.
	 */
	createClient(): ServiceBusClient {
		const fullyQualifiedNamespace = `${this.credentials.namespace}.servicebus.windows.net`;
		return new ServiceBusClient(fullyQualifiedNamespace, new DefaultAzureCredential());
	}
}

/**
 * Factory selector for choosing the appropriate ServiceBusClientFactory based on client options.
 * @abstract
 * @class
 * @package gabriellaroca/azure/service-bus
 */
export abstract class ServiceBusClientFactorySelector {
	/**
	 * Returns an instance of ServiceBusClientFactory based on the provided client options.
	 * @param options Client options specifying credentials for authentication.
	 * @returns Instance of ServiceBusClientFactory based on the provided credentials.
	 * @throws Error if invalid credentials are provided.
	 */
	static getFactory(options: ClientOptions): ServiceBusClientFactory {
		if (options.credentials instanceof ConnectionString) {
			return new ConnectionStringServiceBusClientFactory(options.credentials);
		} else if (options.credentials instanceof IdentityCredential) {
			return new IdentityCredentialServiceBusClientFactory(options.credentials);
		} else {
			throw new Error('Invalid credentials provided');
		}
	}
}
