export interface QueueInterface {
	sendMessage(message: string, queueName: string): void;
	receivedMessage(queueName: string, processMessage: CallbackProcessMessageFunction);
}

export type CallbackProcessMessageFunction = (message: string) => Promise<OutputProcessMessage>;

export type OutputProcessMessage = {
	error?: Error;
	isSuccessful: boolean;
};

export type InputProcessMessage = {
	fileName: string;
};
