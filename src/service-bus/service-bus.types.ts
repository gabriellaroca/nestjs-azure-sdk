import type { TokenCredential } from '@azure/core-auth';
import type {
	ServiceBusClient,
	ServiceBusClientOptions,
	ServiceBusMessage,
	ServiceBusReceivedMessage,
	ServiceBusReceiver,
} from '@azure/service-bus';
import type { AzureModuleAsyncOptions } from '../common/module-options.js';

export interface ServiceBusModuleOptions {
	client?: ServiceBusClient;
	clientOptions?: ServiceBusClientOptions;
	connectionString?: string;
	credential?: TokenCredential;
	enableListeners?: boolean;
	fullyQualifiedNamespace?: string;
	isGlobal?: boolean;
}

export type ServiceBusModuleAsyncOptions = AzureModuleAsyncOptions<ServiceBusModuleOptions>;

export type OutgoingServiceBusMessage<T = unknown> = Omit<ServiceBusMessage, 'body'> & {
	body: T;
};

export type ServiceBusSendOptions = Omit<ServiceBusMessage, 'body'>;

export type TypedServiceBusReceivedMessage<T = unknown> = Omit<ServiceBusReceivedMessage, 'body'> & {
	body: T;
};

export interface ServiceBusListenerOptions {
	autoComplete?: boolean;
	identifier?: string;
	maxAutoLockRenewalDurationInMs?: number;
	maxConcurrentCalls?: number;
	receiveMode?: 'peekLock' | 'receiveAndDelete';
}

export interface ServiceBusListenerContext {
	abandon(propertiesToModify?: ServiceBusMessage['applicationProperties']): Promise<void>;
	complete(): Promise<void>;
	deadLetter(reason: string, description: string): Promise<void>;
	defer(propertiesToModify?: ServiceBusMessage['applicationProperties']): Promise<void>;
	receiver: ServiceBusReceiver;
}

export type ServiceBusListenerHandler<T = unknown> = (
	message: TypedServiceBusReceivedMessage<T>,
	context: ServiceBusListenerContext,
) => void | Promise<void>;

export type ServiceBusListenerDefinition =
	| {
			kind: 'queue';
			options: ServiceBusListenerOptions;
			queues: string[];
	  }
	| {
			kind: 'subscription';
			options: ServiceBusListenerOptions;
			subscription: string;
			topic: string;
	  };
