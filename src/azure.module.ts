import type { DynamicModule, Type } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { BlobStorageModule } from './blob-storage/blob-storage.module.js';
import type { BlobStorageModuleOptions } from './blob-storage/blob-storage.types.js';
import { QueueStorageModule } from './queue-storage/queue-storage.module.js';
import type { QueueStorageModuleOptions } from './queue-storage/queue-storage.types.js';
import { ServiceBusModule } from './service-bus/service-bus.module.js';
import type { ServiceBusModuleOptions } from './service-bus/service-bus.types.js';

export interface AzureModuleOptions {
	blobStorage?: Omit<BlobStorageModuleOptions, 'isGlobal'>;
	isGlobal?: boolean;
	queueStorage?: Omit<QueueStorageModuleOptions, 'isGlobal'>;
	serviceBus?: Omit<ServiceBusModuleOptions, 'isGlobal'>;
}

@Module({})
export class AzureModule {
	static forRoot(options: AzureModuleOptions): DynamicModule {
		const imports: DynamicModule[] = [];
		const exports: Type[] = [];

		if (options.serviceBus) {
			imports.push(ServiceBusModule.forRoot(options.serviceBus));
			exports.push(ServiceBusModule);
		}
		if (options.blobStorage) {
			imports.push(BlobStorageModule.forRoot(options.blobStorage));
			exports.push(BlobStorageModule);
		}
		if (options.queueStorage) {
			imports.push(QueueStorageModule.forRoot(options.queueStorage));
			exports.push(QueueStorageModule);
		}

		return {
			exports,
			global: options.isGlobal ?? false,
			imports,
			module: AzureModule,
		};
	}
}
