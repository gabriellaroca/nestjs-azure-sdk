import type {
	ServiceBusClient,
	ServiceBusReceivedMessage,
	ServiceBusReceiver,
	ServiceBusSender,
	SubscribeOptions,
} from '@azure/service-bus';
import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { SERVICE_BUS_CLIENT } from './service-bus.constants.js';
import type {
	OutgoingServiceBusMessage,
	ServiceBusListenerContext,
	ServiceBusListenerHandler,
	ServiceBusListenerOptions,
	ServiceBusSendOptions,
	TypedServiceBusReceivedMessage,
} from './service-bus.types.js';

@Injectable()
export class ServiceBusService implements OnApplicationShutdown {
	private readonly logger = new Logger(ServiceBusService.name);
	private readonly receivers = new Set<ServiceBusReceiver>();
	private readonly senders = new Map<string, ServiceBusSender>();

	constructor(@Inject(SERVICE_BUS_CLIENT) private readonly client: ServiceBusClient) {}

	async send<T>(queue: string, body: T, options: ServiceBusSendOptions = {}): Promise<void> {
		await this.sender(queue).sendMessages({ ...options, body });
	}

	async sendMany<T>(queue: string, messages: readonly OutgoingServiceBusMessage<T>[]): Promise<void> {
		if (messages.length === 0) {
			return;
		}
		await this.sender(queue).sendMessages([...messages]);
	}

	async publish<T>(topic: string, body: T, options: ServiceBusSendOptions = {}): Promise<void> {
		await this.sender(topic).sendMessages({ ...options, body });
	}

	async publishMany<T>(topic: string, messages: readonly OutgoingServiceBusMessage<T>[]): Promise<void> {
		if (messages.length === 0) {
			return;
		}
		await this.sender(topic).sendMessages([...messages]);
	}

	subscribe<T>(
		queue: string,
		handler: ServiceBusListenerHandler<T>,
		options: ServiceBusListenerOptions = {},
	): ServiceBusReceiver {
		const receiver = this.client.createReceiver(queue, this.receiverOptions(options));
		this.receivers.add(receiver);
		this.startSubscription(receiver, handler, options);
		return receiver;
	}

	subscribeToTopic<T>(
		topic: string,
		subscription: string,
		handler: ServiceBusListenerHandler<T>,
		options: ServiceBusListenerOptions = {},
	): ServiceBusReceiver {
		const receiver = this.client.createReceiver(topic, subscription, this.receiverOptions(options));
		this.receivers.add(receiver);
		this.startSubscription(receiver, handler, options);
		return receiver;
	}

	getClient(): ServiceBusClient {
		return this.client;
	}

	async onApplicationShutdown(): Promise<void> {
		await Promise.allSettled([...this.receivers].map((receiver) => receiver.close()));
		await Promise.allSettled([...this.senders.values()].map((sender) => sender.close()));
		await this.client.close();
		this.receivers.clear();
		this.senders.clear();
	}

	private sender(entity: string): ServiceBusSender {
		const existing = this.senders.get(entity);
		if (existing) {
			return existing;
		}

		const sender = this.client.createSender(entity);
		this.senders.set(entity, sender);
		return sender;
	}

	private receiverOptions(options: ServiceBusListenerOptions) {
		return {
			identifier: options.identifier,
			maxAutoLockRenewalDurationInMs: options.maxAutoLockRenewalDurationInMs,
			receiveMode: options.receiveMode,
		};
	}

	private startSubscription<T>(
		receiver: ServiceBusReceiver,
		handler: ServiceBusListenerHandler<T>,
		options: ServiceBusListenerOptions,
	): void {
		const subscribeOptions: SubscribeOptions = {
			autoCompleteMessages: options.autoComplete ?? true,
			maxConcurrentCalls: options.maxConcurrentCalls ?? 1,
		};

		receiver.subscribe(
			{
				processError: async (args) => {
					this.logger.error(`Receiver error on ${args.entityPath} (${args.errorSource})`, args.error.stack);
				},
				processMessage: async (message) => {
					await handler(message as TypedServiceBusReceivedMessage<T>, this.context(receiver, message));
				},
			},
			subscribeOptions,
		);
	}

	private context(receiver: ServiceBusReceiver, message: ServiceBusReceivedMessage): ServiceBusListenerContext {
		return {
			abandon: (properties) => receiver.abandonMessage(message, properties),
			complete: () => receiver.completeMessage(message),
			deadLetter: (reason, description) =>
				receiver.deadLetterMessage(message, {
					deadLetterErrorDescription: description,
					deadLetterReason: reason,
				}),
			defer: (properties) => receiver.deferMessage(message, properties),
			receiver,
		};
	}
}
