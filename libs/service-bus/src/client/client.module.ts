import { DynamicModule, Module } from '@nestjs/common';
import { ClientOptions } from '../type/client';
import { ServiceBusClientService } from './client.service';

/**
 * Module for integrating with Azure Service Bus.
 * @package ltz-labs/azure/service-bus
 */
@Module({})
export class ServiceBusClientModule {
	/**
	 * Creates a dynamic module to configure and provide ServiceBusClientService.
	 * @param clientOptions Optional client options specifying credentials for authentication.
	 * @returns DynamicModule for configuring the ServiceBusClientService.
	 * @example
	 * ServiceBusClientModule.createClient({
	 *   credentials: new ConnectionString("<your-string-connection>")
	 * });
	 * ServiceBusClientModule.createClient({
	 *   credentials: new IdentityCredential("<your-namespace>")
	 * });
	 */
	static createClient(clientOptions?: ClientOptions): DynamicModule {
		return {
			module: ServiceBusClientModule,
			providers: [
				{
					provide: 'ClientOptions',
					useValue: clientOptions,
				},
				ServiceBusClientService,
			],
			exports: [ServiceBusClientService],
		};
	}
}
