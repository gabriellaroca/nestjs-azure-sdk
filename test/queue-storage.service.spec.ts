import { jest } from '@jest/globals';
import type { QueueServiceClient } from '@azure/storage-queue';
import { QueueStorageService } from '../src/queue-storage/queue-storage.service.js';

describe('QueueStorageService', () => {
	function message(messageText = '{"id":1}') {
		return {
			dequeueCount: 1,
			expiresOn: new Date('2026-09-03T12:00:00.000Z'),
			insertedOn: new Date('2026-08-27T12:00:00.000Z'),
			messageId: 'message-1',
			messageText,
			nextVisibleOn: new Date('2026-08-27T12:00:30.000Z'),
			popReceipt: 'receipt-1',
		};
	}

	function setup() {
		const source = {
			clearMessages: jest.fn<() => Promise<object>>().mockResolvedValue({}),
			createIfNotExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
			deleteIfExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
			deleteMessage: jest.fn<() => Promise<object>>().mockResolvedValue({}),
			peekMessages: jest.fn<() => Promise<object>>().mockResolvedValue({ peekedMessageItems: [] }),
			receiveMessages: jest.fn<() => Promise<object>>().mockResolvedValue({ receivedMessageItems: [message()] }),
			sendMessage: jest.fn<() => Promise<object>>().mockResolvedValue({ messageId: 'sent-1' }),
			updateMessage: jest
				.fn<() => Promise<object>>()
				.mockResolvedValue({ nextVisibleOn: new Date(), popReceipt: 'receipt-2' }),
		};
		const poison = {
			createIfNotExists: jest.fn<() => Promise<object>>().mockResolvedValue({ succeeded: true }),
			sendMessage: jest.fn<() => Promise<object>>().mockResolvedValue({ messageId: 'poison-1' }),
		};
		const client = {
			getQueueClient: jest.fn((queue: string) => (queue === 'orders-poison' ? poison : source)),
		} as unknown as QueueServiceClient;

		return { client, poison, service: new QueueStorageService(client), source };
	}

	it('serializes messages as JSON and optionally creates the queue', async () => {
		const { service, source } = setup();

		await service.send('orders', { id: 1 }, { createQueueIfNotExists: true, visibilityTimeout: 5 });

		expect(source.createIfNotExists).toHaveBeenCalledTimes(1);
		expect(source.sendMessage).toHaveBeenCalledWith('{"id":1}', { visibilityTimeout: 5 });
	});

	it('receives parsed messages and can preserve raw text', async () => {
		const { service, source } = setup();

		const parsed = await service.receive<{ id: number }>('orders', { numberOfMessages: 8 });
		source.receiveMessages.mockResolvedValueOnce({ receivedMessageItems: [message('plain text')] });
		const raw = await service.receive<string>('orders', { raw: true });

		expect(parsed[0]).toEqual(expect.objectContaining({ body: { id: 1 }, queue: 'orders' }));
		expect(raw[0]?.body).toBe('plain text');
		expect(source.receiveMessages).toHaveBeenNthCalledWith(1, { numberOfMessages: 8 });
	});

	it('rejects non-string raw messages', async () => {
		const { service } = setup();

		await expect(service.send('orders', { id: 1 }, { raw: true })).rejects.toThrow(
			'Raw Queue Storage messages must be strings',
		);
	});

	it('moves a failed message before deleting it from the source queue', async () => {
		const { poison, service, source } = setup();
		const [received] = await service.receive<{ id: number }>('orders');

		await service.moveToPoisonQueue('orders', 'orders-poison', received!, new Error('handler failed'));

		expect(poison.createIfNotExists).toHaveBeenCalledTimes(1);
		const [payload] = poison.sendMessage.mock.calls[0] as unknown as [string];
		expect(JSON.parse(payload)).toEqual(
			expect.objectContaining({
				body: { id: 1 },
				dequeueCount: 1,
				messageId: 'message-1',
				sourceQueue: 'orders',
			}),
		);
		expect(source.deleteMessage).toHaveBeenCalledWith('message-1', 'receipt-1');
	});
});
