import type { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { jest } from '@jest/globals';
import { BlobStorageService } from '../../src/blob-storage/blob-storage.service.js';
import { QueueStorageService } from '../../src/queue-storage/queue-storage.service.js';
import { ServiceBusService } from '../../src/service-bus/service-bus.service.js';

const liveTestsEnabled = process.env.AZURE_LIVE_TESTS === 'true';
const describeLive = liveTestsEnabled ? describe : describe.skip;

describeLive('Azure live integration', () => {
	jest.setTimeout(60_000);

	it('uploads and downloads a blob', async () => {
		const connectionString = requiredEnvironmentVariable('AZURE_STORAGE_CONNECTION_STRING');
		const client = BlobServiceClient.fromConnectionString(connectionString);
		const service = new BlobStorageService(client);
		const container = uniqueName('nest-sdk-blob');

		try {
			await service.createContainer(container);
			await service.uploadJson(container, 'message.json', { value: 'ok' });
			await expect(service.downloadJson(container, 'message.json')).resolves.toEqual({ value: 'ok' });
		} finally {
			await service.deleteContainer(container);
		}
	});

	it('sends, receives and deletes a Queue Storage message', async () => {
		const connectionString = requiredEnvironmentVariable('AZURE_STORAGE_CONNECTION_STRING');
		const client = QueueServiceClient.fromConnectionString(connectionString);
		const service = new QueueStorageService(client);
		const queue = uniqueName('nest-sdk-queue');

		try {
			await service.createQueue(queue);
			await service.send(queue, { value: 'ok' });
			const [message] = await service.receive<{ value: string }>(queue, { visibilityTimeout: 30 });
			expect(message?.body).toEqual({ value: 'ok' });
			await service.deleteMessage(queue, message!);
		} finally {
			await service.deleteQueue(queue);
		}
	});

	it('sends and receives a Service Bus message', async () => {
		const connectionString = requiredEnvironmentVariable('AZURE_SERVICE_BUS_CONNECTION_STRING');
		const administration = new ServiceBusAdministrationClient(connectionString);
		const client = new ServiceBusClient(connectionString);
		const service = new ServiceBusService(client);
		const queue = uniqueName('nest-sdk-bus');

		try {
			await administration.createQueue(queue);
			await service.send(queue, { value: 'ok' });
			const receiver = client.createReceiver(queue);
			const [message] = await receiver.receiveMessages(1, { maxWaitTimeInMs: 10_000 });
			expect((message as ServiceBusReceivedMessage | undefined)?.body).toEqual({ value: 'ok' });
			await receiver.completeMessage(message!);
			await receiver.close();
		} finally {
			await service.onApplicationShutdown();
			await administration.deleteQueue(queue);
		}
	});
});

function requiredEnvironmentVariable(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required when AZURE_LIVE_TESTS=true`);
	}
	return value;
}

function uniqueName(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
