import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { QUEUE_STORAGE_LISTENER_METADATA, QUEUE_STORAGE_MODULE_OPTIONS } from './queue-storage.constants.js';
import { QueueStorageService } from './queue-storage.service.js';
import type {
	QueueStorageListenerContext,
	QueueStorageListenerDefinition,
	QueueStorageListenerOptions,
	QueueStorageMessage,
	QueueStorageModuleOptions,
} from './queue-storage.types.js';

type Handler = (message: QueueStorageMessage, context: QueueStorageListenerContext) => void | Promise<void>;

interface ResolvedListenerOptions {
	createQueueIfNotExists: boolean;
	deleteOnSuccess: boolean;
	maxDequeueCount: number;
	maxMessages: number;
	poisonQueue: QueueStorageListenerOptions['poisonQueue'];
	pollIntervalInMs: number;
	raw: boolean;
	visibilityTimeoutInSeconds: number;
}

@Injectable()
export class QueueStorageExplorer implements OnApplicationBootstrap, OnApplicationShutdown {
	private readonly abortController = new AbortController();
	private readonly logger = new Logger(QueueStorageExplorer.name);
	private readonly workers: Array<Promise<void>> = [];

	constructor(
		private readonly discovery: DiscoveryService,
		private readonly metadataScanner: MetadataScanner,
		private readonly queues: QueueStorageService,
		@Inject(QUEUE_STORAGE_MODULE_OPTIONS) private readonly moduleOptions: QueueStorageModuleOptions,
	) {}

	onApplicationBootstrap(): void {
		if (this.moduleOptions.enableListeners === false) {
			return;
		}

		for (const wrapper of this.discovery.getProviders()) {
			const instance = wrapper.instance as object | undefined;
			if (!instance) {
				continue;
			}

			const prototype = Object.getPrototypeOf(instance) as object | null;
			if (!prototype) {
				continue;
			}

			for (const methodName of this.metadataScanner.getAllMethodNames(prototype)) {
				this.register(instance, methodName);
			}
		}
	}

	async onApplicationShutdown(): Promise<void> {
		this.abortController.abort();
		await Promise.allSettled(this.workers);
	}

	private register(instance: object, methodName: string): void {
		const candidate = (instance as Record<string, unknown>)[methodName];
		if (typeof candidate !== 'function') {
			return;
		}

		const definition = Reflect.getMetadata(QUEUE_STORAGE_LISTENER_METADATA, candidate) as
			QueueStorageListenerDefinition | undefined;
		if (!definition) {
			return;
		}

		const handler: Handler = async (message, context) => {
			await candidate.call(instance, message, context);
		};
		const options = this.resolveOptions(definition.options);

		for (const queue of definition.queues) {
			const worker = this.poll(queue, handler, options).catch((error: unknown) => {
				if (!this.abortController.signal.aborted) {
					const cause = this.asError(error);
					this.logger.error(`Queue Storage worker stopped for "${queue}"`, cause.stack);
				}
			});
			this.workers.push(worker);
			this.logger.log(`Listening to Queue Storage queue "${queue}"`);
		}
	}

	private async poll(queue: string, handler: Handler, options: ResolvedListenerOptions): Promise<void> {
		const signal = this.abortController.signal;
		let queueReady = !options.createQueueIfNotExists;

		while (!signal.aborted) {
			try {
				if (!queueReady) {
					await this.queues.createQueue(queue);
					queueReady = true;
				}

				const messages = await this.queues.receive(queue, {
					abortSignal: signal,
					numberOfMessages: options.maxMessages,
					raw: options.raw,
					visibilityTimeout: options.visibilityTimeoutInSeconds,
				});

				await Promise.all(messages.map((message) => this.process(queue, message, handler, options)));
			} catch (error) {
				if (!signal.aborted) {
					const cause = this.asError(error);
					this.logger.error(`Failed to poll Queue Storage queue "${queue}"`, cause.stack);
				}
			}

			await this.delay(options.pollIntervalInMs, signal);
		}
	}

	private async process(
		queue: string,
		message: QueueStorageMessage,
		handler: Handler,
		options: ResolvedListenerOptions,
	): Promise<void> {
		let settled = false;
		const context: QueueStorageListenerContext = {
			delete: async () => {
				await this.queues.deleteMessage(queue, message);
				settled = true;
			},
			updateVisibility: async (visibilityTimeout, body) => {
				const response = await this.queues.updateVisibility(
					queue,
					message,
					visibilityTimeout,
					body,
					options.raw,
				);
				if (response.popReceipt) {
					message.popReceipt = response.popReceipt;
				}
				if (response.nextVisibleOn) {
					message.nextVisibleOn = response.nextVisibleOn;
				}
			},
		};

		try {
			await handler(message, context);
			if (options.deleteOnSuccess && !settled) {
				await this.queues.deleteMessage(queue, message);
			}
		} catch (error) {
			const cause = this.asError(error);
			this.logger.error(
				`Failed to process Queue Storage message "${message.messageId}" from "${queue}"`,
				cause.stack,
			);

			if (settled || message.dequeueCount < options.maxDequeueCount) {
				return;
			}

			const poisonQueue = this.resolvePoisonQueue(queue, options.poisonQueue);
			if (!poisonQueue) {
				return;
			}

			try {
				await this.queues.moveToPoisonQueue(queue, poisonQueue, message, cause);
				this.logger.warn(`Moved message "${message.messageId}" to poison queue "${poisonQueue}"`);
			} catch (poisonError) {
				const poisonCause = this.asError(poisonError);
				this.logger.error(
					`Failed to move message "${message.messageId}" to "${poisonQueue}"`,
					poisonCause.stack,
				);
			}
		}
	}

	private resolveOptions(options: QueueStorageListenerOptions): ResolvedListenerOptions {
		const merged = { ...this.moduleOptions.listenerDefaults, ...options };
		const resolved: ResolvedListenerOptions = {
			createQueueIfNotExists: merged.createQueueIfNotExists ?? false,
			deleteOnSuccess: merged.deleteOnSuccess ?? true,
			maxDequeueCount: merged.maxDequeueCount ?? 5,
			maxMessages: merged.maxMessages ?? 1,
			poisonQueue: merged.poisonQueue,
			pollIntervalInMs: merged.pollIntervalInMs ?? 1_000,
			raw: merged.raw ?? false,
			visibilityTimeoutInSeconds: merged.visibilityTimeoutInSeconds ?? 30,
		};

		if (!Number.isInteger(resolved.maxMessages) || resolved.maxMessages < 1 || resolved.maxMessages > 32) {
			throw new RangeError('maxMessages must be an integer between 1 and 32');
		}
		if (!Number.isInteger(resolved.maxDequeueCount) || resolved.maxDequeueCount < 1) {
			throw new RangeError('maxDequeueCount must be a positive integer');
		}
		if (resolved.pollIntervalInMs < 0) {
			throw new RangeError('pollIntervalInMs cannot be negative');
		}
		if (resolved.visibilityTimeoutInSeconds < 1) {
			throw new RangeError('visibilityTimeoutInSeconds must be at least 1');
		}

		return resolved;
	}

	private resolvePoisonQueue(queue: string, configured: QueueStorageListenerOptions['poisonQueue']): string | false {
		if (configured === false) {
			return false;
		}
		if (typeof configured === 'function') {
			return configured(queue);
		}
		return configured ?? `${queue}-poison`;
	}

	private async delay(milliseconds: number, signal: AbortSignal): Promise<void> {
		if (signal.aborted || milliseconds === 0) {
			return;
		}

		await new Promise<void>((resolve) => {
			const done = () => {
				clearTimeout(timeout);
				signal.removeEventListener('abort', done);
				resolve();
			};
			const timeout = setTimeout(done, milliseconds);
			signal.addEventListener('abort', done, { once: true });
		});
	}

	private asError(error: unknown): Error {
		return error instanceof Error ? error : new Error(String(error));
	}
}
