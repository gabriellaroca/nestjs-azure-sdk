import type {
	QueueClearMessagesResponse,
	QueueCreateIfNotExistsResponse,
	QueueDeleteIfExistsResponse,
	QueueDeleteMessageResponse,
	QueueSendMessageResponse,
	QueueServiceClient,
	QueueUpdateMessageResponse,
} from '@azure/storage-queue';
import { Inject, Injectable } from '@nestjs/common';
import { QUEUE_SERVICE_CLIENT } from './queue-storage.constants.js';
import type {
	QueueStorageMessage,
	QueueStoragePeekedMessage,
	QueueStoragePeekOptions,
	QueueStoragePoisonMessage,
	QueueStorageReceiveOptions,
	QueueStorageSendOptions,
} from './queue-storage.types.js';

@Injectable()
export class QueueStorageService {
	constructor(@Inject(QUEUE_SERVICE_CLIENT) private readonly client: QueueServiceClient) {}

	getClient(): QueueServiceClient {
		return this.client;
	}

	getQueueClient(queue: string) {
		return this.client.getQueueClient(queue);
	}

	async createQueue(queue: string): Promise<QueueCreateIfNotExistsResponse> {
		return this.getQueueClient(queue).createIfNotExists();
	}

	async deleteQueue(queue: string): Promise<QueueDeleteIfExistsResponse> {
		return this.getQueueClient(queue).deleteIfExists();
	}

	async clear(queue: string): Promise<QueueClearMessagesResponse> {
		return this.getQueueClient(queue).clearMessages();
	}

	async send<T>(queue: string, body: T, options: QueueStorageSendOptions = {}): Promise<QueueSendMessageResponse> {
		const { createQueueIfNotExists, raw, ...sendOptions } = options;
		const client = this.getQueueClient(queue);
		if (createQueueIfNotExists) {
			await client.createIfNotExists();
		}

		return client.sendMessage(this.serialize(body, raw), sendOptions);
	}

	async receive<T>(queue: string, options: QueueStorageReceiveOptions = {}): Promise<Array<QueueStorageMessage<T>>> {
		const { raw, ...receiveOptions } = options;
		const response = await this.getQueueClient(queue).receiveMessages(receiveOptions);

		return response.receivedMessageItems.map((message) => ({
			body: this.deserialize<T>(message.messageText, raw),
			dequeueCount: message.dequeueCount,
			expiresOn: message.expiresOn,
			insertedOn: message.insertedOn,
			messageId: message.messageId,
			nextVisibleOn: message.nextVisibleOn,
			popReceipt: message.popReceipt,
			queue,
			raw: message,
		}));
	}

	async peek<T>(queue: string, options: QueueStoragePeekOptions = {}): Promise<Array<QueueStoragePeekedMessage<T>>> {
		const { raw, ...peekOptions } = options;
		const response = await this.getQueueClient(queue).peekMessages(peekOptions);

		return response.peekedMessageItems.map((message) => ({
			body: this.deserialize<T>(message.messageText, raw),
			dequeueCount: message.dequeueCount,
			expiresOn: message.expiresOn,
			insertedOn: message.insertedOn,
			messageId: message.messageId,
			queue,
		}));
	}

	async deleteMessage(
		queue: string,
		message: Pick<QueueStorageMessage, 'messageId' | 'popReceipt'>,
	): Promise<QueueDeleteMessageResponse> {
		return this.getQueueClient(queue).deleteMessage(message.messageId, message.popReceipt);
	}

	async updateVisibility<T>(
		queue: string,
		message: Pick<QueueStorageMessage, 'messageId' | 'popReceipt'>,
		visibilityTimeoutInSeconds: number,
		body?: T,
		raw = false,
	): Promise<QueueUpdateMessageResponse> {
		const serializedBody = body === undefined ? undefined : this.serialize(body, raw);
		return this.getQueueClient(queue).updateMessage(
			message.messageId,
			message.popReceipt,
			serializedBody,
			visibilityTimeoutInSeconds,
		);
	}

	async moveToPoisonQueue<T>(
		sourceQueue: string,
		poisonQueue: string,
		message: QueueStorageMessage<T>,
		error: Error,
	): Promise<void> {
		const poisonMessage: QueueStoragePoisonMessage<T> = {
			body: message.body,
			dequeueCount: message.dequeueCount,
			error: {
				message: error.message,
				name: error.name,
				stack: error.stack,
			},
			failedAt: new Date().toISOString(),
			messageId: message.messageId,
			sourceQueue,
		};

		await this.send(poisonQueue, poisonMessage, { createQueueIfNotExists: true });
		await this.deleteMessage(sourceQueue, message);
	}

	private serialize<T>(body: T, raw = false): string {
		if (raw) {
			if (typeof body !== 'string') {
				throw new TypeError('Raw Queue Storage messages must be strings');
			}
			return body;
		}

		const serialized = JSON.stringify(body);
		if (serialized === undefined) {
			throw new TypeError('Queue Storage message cannot be serialized to JSON');
		}
		return serialized;
	}

	private deserialize<T>(messageText: string, raw = false): T {
		if (raw) {
			return messageText as T;
		}

		try {
			return JSON.parse(messageText) as T;
		} catch {
			return messageText as T;
		}
	}
}
