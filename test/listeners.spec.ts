import { jest } from '@jest/globals';
import type { ServiceBusClient, ServiceBusReceivedMessage, ServiceBusReceiver } from '@azure/service-bus';
import type { QueueServiceClient } from '@azure/storage-queue';
import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueueStorageListener } from '../src/queue-storage/queue-storage.decorators.js';
import { QueueStorageModule } from '../src/queue-storage/queue-storage.module.js';
import type { QueueStorageMessage } from '../src/queue-storage/queue-storage.types.js';
import { ServiceBusListener, ServiceBusSubscription } from '../src/service-bus/service-bus.decorators.js';
import { ServiceBusModule } from '../src/service-bus/service-bus.module.js';

async function eventually(assertion: () => void, timeoutInMs = 1_000): Promise<void> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutInMs) {
		try {
			assertion();
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 5));
		}
	}
	assertion();
}

describe('listener discovery', () => {
	beforeAll(() => {
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
	});
	afterAll(() => jest.restoreAllMocks());

	it('registers one Service Bus receiver for every decorated queue and subscription', async () => {
		const subscriptions: Array<{
			handlers: { processMessage(message: ServiceBusReceivedMessage): Promise<void> };
			receiver: ServiceBusReceiver;
		}> = [];
		const client = {
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			createReceiver: jest.fn((..._args: unknown[]) => {
				const receiver = {
					close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
					subscribe: jest.fn(
						(handlers: { processMessage(message: ServiceBusReceivedMessage): Promise<void> }) =>
							subscriptions.push({ handlers, receiver }),
					),
				} as unknown as ServiceBusReceiver;
				return receiver;
			}),
		} as unknown as ServiceBusClient;

		@Injectable()
		class Consumer {
			readonly handled: string[] = [];

			@ServiceBusListener(['orders-created', 'orders-retried'], { maxConcurrentCalls: 3 })
			async onOrder(message: ServiceBusReceivedMessage): Promise<void> {
				this.handled.push((message.body as { id: string }).id);
			}

			@ServiceBusSubscription('order-events', 'billing')
			async onEvent(message: ServiceBusReceivedMessage): Promise<void> {
				this.handled.push((message.body as { type: string }).type);
			}
		}

		const moduleRef = await Test.createTestingModule({
			imports: [ServiceBusModule.forRoot({ client })],
			providers: [Consumer],
		}).compile();
		await moduleRef.init();

		expect(client.createReceiver).toHaveBeenCalledTimes(3);
		expect(client.createReceiver).toHaveBeenCalledWith(
			'orders-created',
			expect.objectContaining({ receiveMode: undefined }),
		);
		expect(client.createReceiver).toHaveBeenCalledWith(
			'order-events',
			'billing',
			expect.objectContaining({ receiveMode: undefined }),
		);

		await subscriptions[0]!.handlers.processMessage({ body: { id: '1' } } as ServiceBusReceivedMessage);
		await subscriptions[1]!.handlers.processMessage({ body: { id: '2' } } as ServiceBusReceivedMessage);
		await subscriptions[2]!.handlers.processMessage({ body: { type: 'created' } } as ServiceBusReceivedMessage);

		expect(moduleRef.get(Consumer).handled).toEqual(['1', '2', 'created']);
		await moduleRef.close();
	});

	it('polls multiple Queue Storage queues and moves poison messages after the configured attempt', async () => {
		const queueMessages = new Map<string, Array<ReturnType<typeof storageMessage>>>([
			['email-high', [storageMessage('high-1')]],
			['email-low', [storageMessage('low-1')]],
			['failing', [storageMessage('bad-1', 3)]],
		]);
		const clients = new Map<string, ReturnType<typeof queueClient>>();
		const getQueue = (name: string) => {
			let client = clients.get(name);
			if (!client) {
				client = queueClient(queueMessages.get(name) ?? []);
				clients.set(name, client);
			}
			return client;
		};
		const client = {
			getQueueClient: jest.fn(getQueue),
		} as unknown as QueueServiceClient;

		@Injectable()
		class Consumer {
			readonly handled: string[] = [];

			@QueueStorageListener(['email-high', 'email-low'], { maxMessages: 4, pollIntervalInMs: 5 })
			async onEmail(message: QueueStorageMessage<{ id: string }>): Promise<void> {
				this.handled.push(message.body.id);
			}

			@QueueStorageListener('failing', { maxDequeueCount: 3, pollIntervalInMs: 5 })
			async onFailure(): Promise<void> {
				throw new Error('cannot process');
			}
		}

		const moduleRef = await Test.createTestingModule({
			imports: [QueueStorageModule.forRoot({ client })],
			providers: [Consumer],
		}).compile();
		await moduleRef.init();
		const consumer = moduleRef.get(Consumer);

		await eventually(() => {
			expect(consumer.handled).toEqual(expect.arrayContaining(['high-1', 'low-1']));
			expect(getQueue('failing-poison').sendMessage).toHaveBeenCalledTimes(1);
		});

		expect(getQueue('email-high').deleteMessage).toHaveBeenCalledWith('high-1', 'receipt-high-1');
		expect(getQueue('email-low').deleteMessage).toHaveBeenCalledWith('low-1', 'receipt-low-1');
		expect(getQueue('failing').deleteMessage).toHaveBeenCalledWith('bad-1', 'receipt-bad-1');
		await moduleRef.close();
	});
});

function storageMessage(id: string, dequeueCount = 1) {
	return {
		dequeueCount,
		expiresOn: new Date('2026-09-03T12:00:00.000Z'),
		insertedOn: new Date('2026-08-27T12:00:00.000Z'),
		messageId: id,
		messageText: JSON.stringify({ id }),
		nextVisibleOn: new Date('2026-08-27T12:00:30.000Z'),
		popReceipt: `receipt-${id}`,
	};
}

function queueClient(messages: Array<ReturnType<typeof storageMessage>>) {
	return {
		createIfNotExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
		deleteMessage: jest.fn<() => Promise<object>>().mockResolvedValue({}),
		receiveMessages: jest.fn(async () => ({
			receivedMessageItems: messages.splice(0, messages.length),
		})),
		sendMessage: jest.fn<() => Promise<object>>().mockResolvedValue({ messageId: 'sent' }),
		updateMessage: jest.fn<() => Promise<object>>().mockResolvedValue({
			nextVisibleOn: new Date(),
			popReceipt: 'updated-receipt',
		}),
	};
}
