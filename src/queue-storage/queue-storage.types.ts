import type { TokenCredential } from '@azure/core-auth';
import type {
	QueuePeekMessagesOptions,
	QueueReceiveMessageOptions,
	QueueSendMessageOptions,
	QueueServiceClient,
	ReceivedMessageItem,
} from '@azure/storage-queue';
import type { AzureModuleAsyncOptions } from '../common/module-options.js';

export interface QueueStorageModuleOptions {
	accountName?: string;
	client?: QueueServiceClient;
	connectionString?: string;
	credential?: TokenCredential;
	enableListeners?: boolean;
	isGlobal?: boolean;
	listenerDefaults?: QueueStorageListenerOptions;
	serviceUrl?: string;
}

export type QueueStorageModuleAsyncOptions = AzureModuleAsyncOptions<QueueStorageModuleOptions>;

export interface QueueStorageSendOptions extends QueueSendMessageOptions {
	createQueueIfNotExists?: boolean;
	raw?: boolean;
}

export interface QueueStorageReceiveOptions extends QueueReceiveMessageOptions {
	raw?: boolean;
}

export interface QueueStoragePeekOptions extends QueuePeekMessagesOptions {
	raw?: boolean;
}

export interface QueueStorageMessage<T = unknown> {
	body: T;
	dequeueCount: number;
	expiresOn: Date;
	insertedOn: Date;
	messageId: string;
	nextVisibleOn: Date;
	popReceipt: string;
	queue: string;
	raw: ReceivedMessageItem;
}

export interface QueueStoragePeekedMessage<T = unknown> {
	body: T;
	dequeueCount: number;
	expiresOn: Date;
	insertedOn: Date;
	messageId: string;
	queue: string;
}

export interface QueueStorageListenerOptions {
	createQueueIfNotExists?: boolean;
	deleteOnSuccess?: boolean;
	maxDequeueCount?: number;
	maxMessages?: number;
	poisonQueue?: string | false | ((sourceQueue: string) => string | false);
	pollIntervalInMs?: number;
	raw?: boolean;
	visibilityTimeoutInSeconds?: number;
}

export interface QueueStorageListenerContext<T = unknown> {
	delete(): Promise<void>;
	updateVisibility(visibilityTimeoutInSeconds: number, body?: T): Promise<void>;
}

export type QueueStorageListenerHandler<T = unknown> = (
	message: QueueStorageMessage<T>,
	context: QueueStorageListenerContext<T>,
) => void | Promise<void>;

export interface QueueStorageListenerDefinition {
	options: QueueStorageListenerOptions;
	queues: string[];
}

export interface QueueStoragePoisonMessage<T = unknown> {
	body: T;
	dequeueCount: number;
	error: {
		message: string;
		name: string;
		stack?: string;
	};
	failedAt: string;
	messageId: string;
	sourceQueue: string;
}
