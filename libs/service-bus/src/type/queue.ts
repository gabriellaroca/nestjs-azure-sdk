/**
 * Interface que define os métodos esperados para uma fila de mensagens.
 * @package ltz-labs/azure/service-bus
 * @example
 * const queue: QueueInterface = {
 *   sendMessage: (queueName, message) => {
 *     console.log(`Sending message to queue ${queueName}:`, message);
 *   },
 *   receivedMessage: (queueName, processMessage) => {
 *     console.log(`Receiving messages from queue ${queueName}...`);
 *   },
 * };
 */
export interface QueueInterface {
	/**
	 * Envia uma mensagem para a fila especificada.
	 * @param queueName O nome da fila para enviar a mensagem.
	 * @param message A mensagem a ser enviada.
	 */
	sendMessage(queueName: string, message: InputMessage): void;

	/**
	 * Recebe mensagens da fila especificada e processa-as usando a função de callback.
	 * @param queueName O nome da fila para receber mensagens.
	 * @param processMessage A função de callback para processar mensagens recebidas.
	 */
	receivedMessage(queueName: string, processMessage: CallbackProcessMessageFunction);
}

/**
 * Tipo que define a estrutura de uma mensagem de saída processada.
 */
export type OutputProcessMessage = {
	/**
	 * Indica se o processamento foi bem-sucedido.
	 */
	isSuccessful: boolean;
	/**
	 * Opcional: indica o erro encontrado durante o processamento.
	 */
	error?: Error;
};

/**
 * Tipo que define a estrutura de uma mensagem de entrada para processamento.
 */
export type InputProcessMessage = {
	/**
	 * O nome do arquivo associado à mensagem de entrada.
	 */
	fileName: string;
};

/**
 * Classe que define a estrutura de uma mensagem de saída.
 */
export class OutputMessage {
	/**
	 * O ID único da mensagem.
	 */
	messageId: string;
	/**
	 * O corpo da mensagem.
	 */
	body: string;
	/**
	 * Metadados adicionais associados à mensagem.
	 */
	metadata?: {
        [key: string]: number | boolean | string | Date | null;
    };;
}

/**
 * Tipo que define a estrutura de uma mensagem de entrada.
 */
export type InputMessage = {
	/**
	 * Opcional: O ID único da mensagem.
	 */
	messageId?: string;
	/**
	 * O corpo da mensagem.
	 */
	body: string;
	/**
	 * Opcional: Metadados associados à mensagem.
	 */
	metadata?: {
        [key: string]: number | boolean | string | Date | null;
    };
};

/**
 * Tipo que define a estrutura de metadados associados a uma mensagem.
 */
export type MessageMetadata = {
	[key: string]: number | boolean | string | Date | null;
};

/**
 * Tipo de função de callback para processar mensagens de saída.
 */
export type CallbackProcessMessageFunction = (message: OutputMessage) => void;

/**
 * Interface que define a estrutura básica de uma fila.
 */
export interface IQueue {
	/**
	 * O nome da fila.
	 */
	name: string;
}
