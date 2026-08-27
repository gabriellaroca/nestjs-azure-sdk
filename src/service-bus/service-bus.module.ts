import type { Provider } from '@nestjs/common';
import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { createServiceBusClient } from './service-bus.client.js';
import { SERVICE_BUS_CLIENT, SERVICE_BUS_MODULE_OPTIONS } from './service-bus.constants.js';
import { ServiceBusExplorer } from './service-bus.explorer.js';
import { ServiceBusService } from './service-bus.service.js';
import type { ServiceBusModuleAsyncOptions, ServiceBusModuleOptions } from './service-bus.types.js';

@Module({})
export class ServiceBusModule {
	static forRoot(options: ServiceBusModuleOptions): DynamicModule {
		return this.register(
			{
				provide: SERVICE_BUS_MODULE_OPTIONS,
				useValue: options,
			},
			options.isGlobal ?? false,
		);
	}

	static forRootAsync(options: ServiceBusModuleAsyncOptions): DynamicModule {
		return this.register(
			{
				inject: options.inject ?? [],
				provide: SERVICE_BUS_MODULE_OPTIONS,
				useFactory: options.useFactory,
			},
			options.isGlobal ?? false,
			options.imports,
		);
	}

	private static register(
		optionsProvider: Provider,
		global: boolean,
		imports: ServiceBusModuleAsyncOptions['imports'] = [],
	): DynamicModule {
		const clientProvider: Provider = {
			inject: [SERVICE_BUS_MODULE_OPTIONS],
			provide: SERVICE_BUS_CLIENT,
			useFactory: createServiceBusClient,
		};

		return {
			exports: [SERVICE_BUS_CLIENT, ServiceBusService],
			global,
			imports: [...(imports ?? []), DiscoveryModule],
			module: ServiceBusModule,
			providers: [optionsProvider, clientProvider, ServiceBusService, ServiceBusExplorer],
		};
	}
}
