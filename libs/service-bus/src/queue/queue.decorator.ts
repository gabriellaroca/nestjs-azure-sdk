import { Inject, Injectable } from '@nestjs/common';
import { CallbackProcessMessageFunction, InputMessage, IQueue, OutputMessage } from '../type/queue';
import { ServiceBusQueueService } from './queue.service';

/**
 * Represents a queue handler that implements the IQueue interface for message processing.
 * This class integrates with a messaging service through ServiceBusQueueService.
 */
@Injectable()
export class Queue implements IQueue {
	private callbackFunction?: CallbackProcessMessageFunction;

	@Inject()
	private readonly queueService: ServiceBusQueueService;

	/**
	 * Initializes the Queue with a specified name.
	 * @param name The name of the queue.
	 * @example
	 * const queue = new Queue('myQueue');
	 */
	constructor(public name: string) {}

	/**
	 * Initiates the message processing callback on the registered queue.
	 * This method is private and used internally to handle incoming messages.
	 * @param callbackFunction The callback function to process messages.
	 */
	private async onProcess(callbackFunction: CallbackProcessMessageFunction) {
		await this.queueService.receivedMessage(this.name, callbackFunction);
	}

	/**
	 * Registers a callback function to process messages received on the queue.
	 * @param callback The callback function to be registered.
	 * @example
	 * queue.registerProcessCallback((message) => {
	 *   console.log('Received message:', message);
	 * });
	 */
	registerProcessCallback(callback: CallbackProcessMessageFunction) {
		this.onProcess(callback);
	}

	/**
	 * Simulates the arrival of a message to trigger the registered callback function.
	 * If no callback function is defined, logs a message to the console.
	 * @param message The input message to simulate.
	 * @example
	 * const message = { messageId: '123', body: 'Hello World' };
	 * queue.simulateMessageArrival(message);
	 */
	simulateMessageArrival(message: InputMessage) {
		if (this.callbackFunction) {
			const outputMessage: OutputMessage = {
				messageId: message.messageId || 'default-id',
				body: message.body || '',
				metadata: message.metadata,
			};
			this.callbackFunction(outputMessage);
		} else {
			console.log('No callback function defined for message simulation.');
		}
	}

	/**
	 * Sends a message to the registered queue using the injected queue service.
	 * @param message The input message to send.
	 * @example
	 * const message = { messageId: '456', body: 'Another message' };
	 * await queue.sendMessage(message);
	 */
	async sendMessage(message: InputMessage) {
		await this.queueService.sendMessage(this.name, message);
	}
}

/**
 * Custom parameter decorator for injecting a Queue instance based on a specified queue name.
 * This decorator creates a new Queue instance and registers process callbacks from the decorated class.
 * @param queueName The name of the queue to inject.
 */
export const InjectQueue = (queueName: string): ParameterDecorator => {
	return (target, propertyKey, parameterIndex) => {
		const queue = new Queue(queueName);

		// Get the list of method names that are decorated with @OnProcess in the target class
		const processMethods = target.constructor.prototype.processMethods || [];

		// Register each method as a process callback in the newly created queue instance
		processMethods.forEach((methodName: string) => {
			queue.registerProcessCallback(target[methodName].bind(target));
		});

		// Inject the created queue instance into the target property or constructor parameter
		Inject(queue)(target, propertyKey, parameterIndex);
	};
};

/**
 * Method decorator to ensure a method accepts OutputMessage as a parameter.
 * This decorator validates that the method signature matches the expected message processing format.
 */
export function OnProcess(): MethodDecorator {
    return (_: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        // Override the original method to enforce the parameter type checking
        descriptor.value = function (this: unknown, message: OutputMessage) {
            if (message instanceof OutputMessage) {
                return originalMethod.apply(this, [message]);
            } else {
                throw new Error(`Method ${String(propertyKey)} must have parameter of type OutputMessage`);
            }
        };

        return descriptor;
    };
}



