/**
 * Represents a connection string used for authentication with Azure Service Bus.
 *
 * @package ltz-labs/azure/service-bus
 */
export class ConnectionString {
	/**
	 * The connection token or string required for authentication.
	 */
	token: string;
}

/**
 * Represents identity credentials used for authentication with Azure Service Bus.
 *
 * @package ltz-labs/azure/service-bus
 */
export class IdentityCredential {
	/**
	 * The namespace identifier used for authentication.
	 */
	namespace: string;
}

/**
 * Interface defining the client options to connect to Azure Service Bus.
 * Allows providing either a ConnectionString or IdentityCredential for authentication.
 *
 * @package ltz-labs/azure/service-bus
 */
export interface ClientOptions {
	/**
	 * The credentials used for authentication. Can be either a ConnectionString or IdentityCredential.
	 */
	credentials: ConnectionString | IdentityCredential;
}
