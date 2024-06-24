import { ServiceBusClient } from '@azure/service-bus';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InvalidClientOptionsException, ServiceBusClientCreationException } from '../exception/client-options.exception';
import { ClientOptions, ConnectionString, IdentityCredential } from '../type/client';
import { ServiceBusClientFactory, ServiceBusClientFactorySelector } from './client.factory';

/**
 * Service responsible for managing the lifecycle of ServiceBusClient instances.
 * Initializes the client on module start and closes it on module destroy.
 * @implements OnModuleInit, OnModuleDestroy
 */
@Injectable()
export class ServiceBusClientService implements OnModuleInit, OnModuleDestroy {
	private factory: ServiceBusClientFactory;
	private instance: ServiceBusClient;

	/**
	 * Constructor of ServiceBusClientService.
	 * @constructor
	 * @param clientOptions Client options specifying credentials for authentication.
	 */
	constructor(
		@Inject('ClientOptions')
		private readonly clientOptions: ClientOptions,
	) {
		this.validateClientOptions(clientOptions);
		this.factory = ServiceBusClientFactorySelector.getFactory(this.clientOptions);
	}

	/**
	 * Initializes the ServiceBusClient instance on module start.
	 * Logs initialization status.
	 * @returns void
	 */
	async onModuleInit(): Promise<void> {
		Logger.log('Initializing ServiceBusClient instance on module start', ServiceBusClientService.name);
		this.instance = this.createClient();
	}

	/**
	 * Retrieves the current instance of ServiceBusClient.
	 * If instance does not exist, creates a new one and logs creation status.
	 * @returns Current instance of ServiceBusClient.
	 */
	public getInstance(): ServiceBusClient {
		if (!this.instance) {
			Logger.log('Creating a new ServiceBusClient instance', ServiceBusClientService.name);
			this.instance = this.createClient();
		}
		return this.instance;
	}

	/**
	 * Creates a new instance of ServiceBusClient using the configured factory.
	 * Logs success or failure during creation.
	 * @returns Newly created instance of ServiceBusClient.
	 * @throws ServiceBusClientCreationException if failed to create ServiceBusClient instance.
	 */
	private createClient(): ServiceBusClient {
		try {
			const client = this.factory.createClient();
			Logger.log('ServiceBusClient instance created successfully', ServiceBusClientService.name);
			return client;
		} catch (error) {
			const errorMessage = 'Failed to create ServiceBusClient instance';
			Logger.error(errorMessage, error, ServiceBusClientService.name);
			throw new ServiceBusClientCreationException(errorMessage);
		}
	}

	/**
	 * Validates the provided client options to ensure required credentials are present.
	 * @param options Client options to validate.
	 * @returns void
	 * @throws InvalidClientOptionsException if client options are invalid.
	 */
	private validateClientOptions(options: ClientOptions): void {
		if (!options || !options.credentials) {
			throw new InvalidClientOptionsException('Invalid client options: credentials are required');
		}
		if (!(options.credentials instanceof ConnectionString || options.credentials instanceof IdentityCredential)) {
			throw new InvalidClientOptionsException('Invalid client options: credentials must be of type ConnectionString or IdentityCredential');
		}
	}

	/**
	 * Cleans up and closes the ServiceBusClient instance on module shutdown.
	 * Logs closure status.
	 * @returns void
	 */
	onModuleDestroy(): void {
		if (this.instance) {
			this.instance.close();
			Logger.log('ServiceBusClient instance closed', ServiceBusClientService.name);
		}
	}
}
