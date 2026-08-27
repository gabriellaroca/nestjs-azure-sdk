import { jest } from '@jest/globals';
import type {
	ProcessErrorArgs,
	ServiceBusClient,
	ServiceBusReceivedMessage,
	ServiceBusReceiver,
	ServiceBusSender,
} from '@azure/service-bus';
import { ServiceBusService } from '../src/service-bus/service-bus.service.js';
import type {
	ServiceBusListenerContext,
	TypedServiceBusReceivedMessage,
} from '../src/service-bus/service-bus.types.js';

describe('ServiceBusService', () => {
	function setup() {
		const sender = {
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			sendMessages: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		} as unknown as ServiceBusSender;
		const receiver = {
			abandonMessage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			completeMessage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			deadLetterMessage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			deferMessage: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			subscribe: jest.fn(),
		} as unknown as ServiceBusReceiver;
		const client = {
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			createReceiver: jest.fn(() => receiver),
			createSender: jest.fn(() => sender),
		} as unknown as ServiceBusClient;

		return { client, receiver, sender, service: new ServiceBusService(client) };
	}

	it('reuses senders and sends queue and topic messages', async () => {
		const { client, sender, service } = setup();

		await service.send('orders', { id: 1 }, { correlationId: 'request-1' });
		await service.send('orders', { id: 2 });
		await service.sendMany('orders', [{ body: { id: 3 }, messageId: '3' }]);
		await service.publish('events', { type: 'order.created' });

		expect(client.createSender).toHaveBeenCalledTimes(2);
		expect(client.createSender).toHaveBeenNthCalledWith(1, 'orders');
		expect(sender.sendMessages).toHaveBeenNthCalledWith(1, {
			body: { id: 1 },
			correlationId: 'request-1',
		});
		expect(sender.sendMessages).toHaveBeenNthCalledWith(3, [{ body: { id: 3 }, messageId: '3' }]);
	});

	it('creates a receiver and exposes settlement helpers to a handler', async () => {
		const { client, receiver, service } = setup();
		const handler = jest.fn(async (_message: TypedServiceBusReceivedMessage, context: ServiceBusListenerContext) =>
			context.complete(),
		);

		service.subscribe('orders', handler, {
			autoComplete: false,
			maxAutoLockRenewalDurationInMs: 60_000,
			maxConcurrentCalls: 4,
		});

		expect(client.createReceiver).toHaveBeenCalledWith('orders', {
			identifier: undefined,
			maxAutoLockRenewalDurationInMs: 60_000,
			receiveMode: undefined,
		});

		const [handlers, subscribeOptions] = (receiver.subscribe as jest.Mock).mock.calls[0] as [
			{
				processError(args: ProcessErrorArgs): Promise<void>;
				processMessage(message: ServiceBusReceivedMessage): Promise<void>;
			},
			object,
		];
		const message = { body: { id: 1 }, messageId: 'message-1' } as ServiceBusReceivedMessage;
		await handlers.processMessage(message);

		expect(handler).toHaveBeenCalledWith(message, expect.objectContaining({ receiver }));
		expect(receiver.completeMessage).toHaveBeenCalledWith(message);
		expect(subscribeOptions).toEqual({ autoCompleteMessages: false, maxConcurrentCalls: 4 });
	});

	it('closes every link and the client during shutdown', async () => {
		const { client, receiver, sender, service } = setup();
		await service.send('orders', { id: 1 });
		service.subscribe('orders', async () => undefined);

		await service.onApplicationShutdown();

		expect(receiver.close).toHaveBeenCalledTimes(1);
		expect(sender.close).toHaveBeenCalledTimes(1);
		expect(client.close).toHaveBeenCalledTimes(1);
	});
});
