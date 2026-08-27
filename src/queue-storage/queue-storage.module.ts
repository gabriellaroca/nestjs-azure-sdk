import type { Provider } from '@nestjs/common';
import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { createQueueServiceClient } from './queue-storage.client.js';
import { QUEUE_SERVICE_CLIENT, QUEUE_STORAGE_MODULE_OPTIONS } from './queue-storage.constants.js';
import { QueueStorageExplorer } from './queue-storage.explorer.js';
import { QueueStorageService } from './queue-storage.service.js';
import type { QueueStorageModuleAsyncOptions, QueueStorageModuleOptions } from './queue-storage.types.js';

@Module({})
export class QueueStorageModule {
	static forRoot(options: QueueStorageModuleOptions): DynamicModule {
		return this.register(
			{
				provide: QUEUE_STORAGE_MODULE_OPTIONS,
				useValue: options,
			},
			options.isGlobal ?? false,
		);
	}

	static forRootAsync(options: QueueStorageModuleAsyncOptions): DynamicModule {
		return this.register(
			{
				inject: options.inject ?? [],
				provide: QUEUE_STORAGE_MODULE_OPTIONS,
				useFactory: options.useFactory,
			},
			options.isGlobal ?? false,
			options.imports,
		);
	}

	private static register(
		optionsProvider: Provider,
		global: boolean,
		imports: QueueStorageModuleAsyncOptions['imports'] = [],
	): DynamicModule {
		const clientProvider: Provider = {
			inject: [QUEUE_STORAGE_MODULE_OPTIONS],
			provide: QUEUE_SERVICE_CLIENT,
			useFactory: createQueueServiceClient,
		};

		return {
			exports: [QUEUE_SERVICE_CLIENT, QueueStorageService],
			global,
			imports: [...(imports ?? []), DiscoveryModule],
			module: QueueStorageModule,
			providers: [optionsProvider, clientProvider, QueueStorageService, QueueStorageExplorer],
		};
	}
}
