/**
 * Exception thrown when client options are invalid.
 * @class
 */
export class InvalidClientOptionsException extends Error {
	/**
	 * Creates an instance of InvalidClientOptionsException.
	 * @constructor
	 * @param message Error message describing why client options are invalid.
	 */
	constructor(message: string) {
		super(message);
		this.name = 'InvalidClientOptionsException';
	}
}

/**
 * Exception thrown when failed to create ServiceBusClient instance.
 * @class
 */
export class ServiceBusClientCreationException extends Error {
	/**
	 * Creates an instance of ServiceBusClientCreationException.
	 * @constructor
	 * @param message Error message describing the failure to create ServiceBusClient.
	 */
	constructor(message: string) {
		super(message);
		this.name = 'ServiceBusClientCreationException';
	}
}
