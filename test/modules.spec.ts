import { jest } from '@jest/globals';
import type { ServiceBusClient } from '@azure/service-bus';
import type { BlobServiceClient } from '@azure/storage-blob';
import type { QueueServiceClient } from '@azure/storage-queue';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AzureModule } from '../src/azure.module.js';
import { BlobStorageService } from '../src/blob-storage/blob-storage.service.js';
import { QueueStorageService } from '../src/queue-storage/queue-storage.service.js';
import { ServiceBusModule } from '../src/service-bus/service-bus.module.js';
import { ServiceBusService } from '../src/service-bus/service-bus.service.js';

describe('Azure modules', () => {
	it('makes all enabled services available through the global AzureModule', async () => {
		const serviceBusClient = {
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		} as unknown as ServiceBusClient;
		const blobClient = {} as BlobServiceClient;
		const queueClient = {} as QueueServiceClient;

		@Injectable()
		class Consumer {
			constructor(
				readonly serviceBus: ServiceBusService,
				readonly blobs: BlobStorageService,
				readonly queues: QueueStorageService,
			) {}
		}

		@Module({ providers: [Consumer], exports: [Consumer] })
		class FeatureModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [
				AzureModule.forRoot({
					blobStorage: { client: blobClient },
					isGlobal: true,
					queueStorage: { client: queueClient, enableListeners: false },
					serviceBus: { client: serviceBusClient, enableListeners: false },
				}),
				FeatureModule,
			],
		}).compile();
		await moduleRef.init();

		const consumer = moduleRef.get(Consumer);
		expect(consumer.serviceBus).toBeInstanceOf(ServiceBusService);
		expect(consumer.blobs).toBeInstanceOf(BlobStorageService);
		expect(consumer.queues).toBeInstanceOf(QueueStorageService);

		await moduleRef.close();
	});

	it('supports asynchronous module configuration with dependency injection', async () => {
		const client = {
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		} as unknown as ServiceBusClient;
		const clientToken = Symbol('TEST_SERVICE_BUS_CLIENT');

		@Module({
			exports: [clientToken],
			providers: [{ provide: clientToken, useValue: client }],
		})
		class ConfigurationModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [
				ServiceBusModule.forRootAsync({
					imports: [ConfigurationModule],
					inject: [clientToken],
					useFactory: (injectedClient: ServiceBusClient) => ({
						client: injectedClient,
						enableListeners: false,
					}),
				}),
			],
		}).compile();
		await moduleRef.init();

		expect(moduleRef.get(ServiceBusService).getClient()).toBe(client);
		await moduleRef.close();
	});
});
