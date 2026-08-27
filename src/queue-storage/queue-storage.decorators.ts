import { Inject } from '@nestjs/common';
import { QUEUE_SERVICE_CLIENT, QUEUE_STORAGE_LISTENER_METADATA } from './queue-storage.constants.js';
import type { QueueStorageListenerDefinition, QueueStorageListenerOptions } from './queue-storage.types.js';

function normalizeQueueNames(queue: string | readonly string[]): string[] {
	const names = (Array.isArray(queue) ? queue : [queue]).map((name) => name.trim());
	if (names.length === 0 || names.some((name) => !name)) {
		throw new Error('At least one non-empty queue name is required');
	}
	return [...new Set(names)];
}

export function QueueStorageListener(
	queue: string | readonly string[],
	options: QueueStorageListenerOptions = {},
): MethodDecorator {
	const definition: QueueStorageListenerDefinition = {
		options,
		queues: normalizeQueueNames(queue),
	};

	return (_target, _propertyKey, descriptor) => {
		Reflect.defineMetadata(QUEUE_STORAGE_LISTENER_METADATA, definition, descriptor.value as object);
	};
}

export const InjectQueueServiceClient = (): ParameterDecorator => Inject(QUEUE_SERVICE_CLIENT);
