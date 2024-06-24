import { ServiceBusClient, ServiceBusReceivedMessage, ServiceBusReceiver, ServiceBusSender } from '@azure/service-bus';
import { Injectable, Logger } from '@nestjs/common';
import { ServiceBusClientService } from '../client/client.service';
import { CallbackProcessMessageFunction, QueueInterface } from '../type/queue';

/**
 * Implementation of QueueInterface for handling messages using Azure Service Bus.
 * @implements QueueInterface
 */
@Injectable()
export class ServiceBusQueueService implements QueueInterface {
	private readonly azureClient: ServiceBusClient;

	/**
	 * Constructs a new instance of ServiceBusQueueService.
	 * @constructor
	 * @param serviceBusClientService Service for managing Service Bus client lifecycle.
	 */
	constructor(private readonly serviceBusClientService: ServiceBusClientService) {
		this.azureClient = this.serviceBusClientService.getInstance();
	}

	/**
	 * Sends a message to the specified queue.
	 * @param message The message content to send.
	 * @param queueName The name of the queue to send the message to.
	 * @returns Promise<void>
	 */
	async sendMessage(message: string, queueName: string): Promise<void> {
		const sender = this.createSender(queueName);
		await sender.sendMessages({ body: message });
	}

	/**
	 * Receives messages from the specified queue and processes them using the provided processor function.
	 * @param queueName The name of the queue to receive messages from.
	 * @param processor The function to process each received message.
	 * @returns Promise<void>
	 */
	async receivedMessage(queueName: string, processor: CallbackProcessMessageFunction): Promise<void> {
		const receiver = this.createReceiver(queueName);

		receiver.subscribe(
			{
				processMessage: async (message: ServiceBusReceivedMessage) => {
					try {
						const response = await processor(message.body);
						if (!response.isSuccessful && response.error) {
							await this.deadLetterMessage(receiver, message, response.error);
						} else {
							await receiver.completeMessage(message);
						}
					} catch (error) {
						Logger.error(`Error processing message: ${error.message}`, error.stack, ServiceBusQueueService.name);
						await receiver.abandonMessage(message);
					}
				},
				processError: async (error) => {
					Logger.error(`Error from Service Bus subscription: ${error}`, error, ServiceBusQueueService.name);
				},
			},
			{ maxConcurrentCalls: 1, autoCompleteMessages: false },
		);
	}

	/**
	 * Creates a sender for the specified queue.
	 * @param queueName The name of the queue to create the sender for.
	 * @returns ServiceBusSender
	 * @private
	 */
	private createSender(queueName: string): ServiceBusSender {
		return this.azureClient.createSender(queueName);
	}

	/**
	 * Creates a receiver for the specified queue.
	 * @param queueName The name of the queue to create the receiver for.
	 * @returns ServiceBusReceiver
	 * @private
	 */
	private createReceiver(queueName: string): ServiceBusReceiver {
		return this.azureClient.createReceiver(queueName);
	}

	/**
	 * Moves a message to the dead-letter queue.
	 * @param receiver The receiver instance handling the message.
	 * @param message The message to move to the dead-letter queue.
	 * @param error The error information indicating why the message is being moved to dead-letter.
	 * @returns Promise<void>
	 * @private
	 */
	private async deadLetterMessage(receiver: ServiceBusReceiver, message: ServiceBusReceivedMessage, error: Error): Promise<void> {
		await receiver.deadLetterMessage(message, {
			deadLetterReason: error.name,
			deadLetterErrorDescription: error.message,
		});
	}
}
