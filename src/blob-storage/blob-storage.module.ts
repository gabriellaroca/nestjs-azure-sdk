import type { Provider } from '@nestjs/common';
import { DynamicModule, Module } from '@nestjs/common';
import { createBlobServiceClient } from './blob-storage.client.js';
import { BLOB_SERVICE_CLIENT, BLOB_STORAGE_MODULE_OPTIONS } from './blob-storage.constants.js';
import { BlobStorageService } from './blob-storage.service.js';
import type { BlobStorageModuleAsyncOptions, BlobStorageModuleOptions } from './blob-storage.types.js';

@Module({})
export class BlobStorageModule {
	static forRoot(options: BlobStorageModuleOptions): DynamicModule {
		return this.register(
			{
				provide: BLOB_STORAGE_MODULE_OPTIONS,
				useValue: options,
			},
			options.isGlobal ?? false,
		);
	}

	static forRootAsync(options: BlobStorageModuleAsyncOptions): DynamicModule {
		return this.register(
			{
				inject: options.inject ?? [],
				provide: BLOB_STORAGE_MODULE_OPTIONS,
				useFactory: options.useFactory,
			},
			options.isGlobal ?? false,
			options.imports,
		);
	}

	private static register(
		optionsProvider: Provider,
		global: boolean,
		imports: BlobStorageModuleAsyncOptions['imports'] = [],
	): DynamicModule {
		const clientProvider: Provider = {
			inject: [BLOB_STORAGE_MODULE_OPTIONS],
			provide: BLOB_SERVICE_CLIENT,
			useFactory: createBlobServiceClient,
		};

		return {
			exports: [BLOB_SERVICE_CLIENT, BlobStorageService],
			global,
			imports: imports ?? [],
			module: BlobStorageModule,
			providers: [optionsProvider, clientProvider, BlobStorageService],
		};
	}
}
