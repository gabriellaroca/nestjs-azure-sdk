import type { ServiceBusReceivedMessage } from '@azure/service-bus';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { SERVICE_BUS_LISTENER_METADATA, SERVICE_BUS_MODULE_OPTIONS } from './service-bus.constants.js';
import { ServiceBusService } from './service-bus.service.js';
import type {
	ServiceBusListenerContext,
	ServiceBusListenerDefinition,
	ServiceBusModuleOptions,
} from './service-bus.types.js';

type Handler = (message: ServiceBusReceivedMessage, context: ServiceBusListenerContext) => void | Promise<void>;

@Injectable()
export class ServiceBusExplorer implements OnApplicationBootstrap {
	private readonly logger = new Logger(ServiceBusExplorer.name);

	constructor(
		private readonly discovery: DiscoveryService,
		private readonly metadataScanner: MetadataScanner,
		private readonly serviceBus: ServiceBusService,
		@Inject(SERVICE_BUS_MODULE_OPTIONS) private readonly options: ServiceBusModuleOptions,
	) {}

	onApplicationBootstrap(): void {
		if (this.options.enableListeners === false) {
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

	private register(instance: object, methodName: string): void {
		const candidate = (instance as Record<string, unknown>)[methodName];
		if (typeof candidate !== 'function') {
			return;
		}

		const definition = Reflect.getMetadata(SERVICE_BUS_LISTENER_METADATA, candidate) as
			ServiceBusListenerDefinition | undefined;
		if (!definition) {
			return;
		}

		const handler: Handler = async (message, context) => {
			await candidate.call(instance, message, context);
		};

		if (definition.kind === 'queue') {
			for (const queue of definition.queues) {
				this.serviceBus.subscribe(queue, handler, definition.options);
				this.logger.log(`Listening to Service Bus queue "${queue}"`);
			}
			return;
		}

		this.serviceBus.subscribeToTopic(definition.topic, definition.subscription, handler, definition.options);
		this.logger.log(`Listening to Service Bus subscription "${definition.topic}/${definition.subscription}"`);
	}
}
