import { DynamicModule, Module } from '@nestjs/common';
import { ServiceBusClientModule } from '../client/client.module';
import { ClientOptions } from '../type/client';
import { Queue } from './queue.decorator';
import { ServiceBusQueueService } from './queue.service';

/**
 * NestJS module for managing Service Bus queues.
 * This module integrates with Service Bus through client configuration options.
 * It provides a DynamicModule for initialization and configuration.
 */
@Module({})
export class ServiceBusQueueModule {
	/**
	 * Creates a dynamic module for ServiceBusQueueModule with specified client options.
	 * @param options The client options for configuring Service Bus connection.
	 * @returns A DynamicModule for initializing the ServiceBusQueueModule.
	 * @example
	 * const connectionStringOptions: ClientOptions = {
	 *   credentials: {
	 *     token: 'your_connection_string_token_here',
	 *   },
	 * };
	 * const module = ServiceBusQueueModule.create(connectionStringOptions);
	 *
	 * @example
	 * const identityCredentialOptions: ClientOptions = {
	 *   credentials: {
	 *     namespace: 'your_service_bus_namespace',
	 *   },
	 * };
	 * const module = ServiceBusQueueModule.create(identityCredentialOptions);
	 */
	static create(options: ClientOptions): DynamicModule {
		return {
			module: ServiceBusQueueModule,
			imports: [ServiceBusClientModule.createClient(options)],
			providers: [ServiceBusQueueService, Queue],
			exports: [ServiceBusQueueService],
		};
	}
}
