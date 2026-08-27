import { Inject } from '@nestjs/common';
import { SERVICE_BUS_CLIENT, SERVICE_BUS_LISTENER_METADATA } from './service-bus.constants.js';
import type { ServiceBusListenerDefinition, ServiceBusListenerOptions } from './service-bus.types.js';

function assertName(value: string, label: string): string {
	const name = value.trim();
	if (!name) {
		throw new Error(`${label} cannot be empty`);
	}
	return name;
}

export function ServiceBusListener(
	queue: string | readonly string[],
	options: ServiceBusListenerOptions = {},
): MethodDecorator {
	const queueNames = (Array.isArray(queue) ? queue : [queue]).map((name) => assertName(name, 'Queue name'));
	if (queueNames.length === 0) {
		throw new Error('At least one queue name is required');
	}

	const definition: ServiceBusListenerDefinition = {
		kind: 'queue',
		options,
		queues: [...new Set(queueNames)],
	};

	return (_target, _propertyKey, descriptor) => {
		Reflect.defineMetadata(SERVICE_BUS_LISTENER_METADATA, definition, descriptor.value as object);
	};
}

export function ServiceBusSubscription(
	topic: string,
	subscription: string,
	options: ServiceBusListenerOptions = {},
): MethodDecorator {
	const definition: ServiceBusListenerDefinition = {
		kind: 'subscription',
		options,
		subscription: assertName(subscription, 'Subscription name'),
		topic: assertName(topic, 'Topic name'),
	};

	return (_target, _propertyKey, descriptor) => {
		Reflect.defineMetadata(SERVICE_BUS_LISTENER_METADATA, definition, descriptor.value as object);
	};
}

export const InjectServiceBusClient = (): ParameterDecorator => Inject(SERVICE_BUS_CLIENT);
