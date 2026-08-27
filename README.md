# nestjs-azure-sdk

Integração enxuta entre NestJS e os serviços Azure mais usados por microsserviços:

- Azure Service Bus: filas, tópicos, subscriptions e múltiplos listeners;
- Azure Blob Storage: upload, download, JSON, streams, arquivos e listagem;
- Azure Queue Storage: envio, recebimento, múltiplos workers e poison queue.

Os clientes oficiais da Azure são reutilizados durante toda a vida da aplicação. Senders, receivers e workers são encerrados no shutdown do NestJS.

## Requisitos

- Node.js 22 LTS ou Node.js 24.0.1+;
- NestJS 10, 11 ou 12;
- aplicação com decorators e `reflect-metadata` habilitados.

Esta versão é ESM e usa as versões estáveis atuais dos SDKs oficiais da Azure.

## Instalação

```bash
pnpm add nestjs-azure-sdk
```

Também funciona com npm ou Yarn.

## Configuração simples

Use `AzureModule` quando a aplicação utiliza mais de um serviço:

```ts
import { Module } from '@nestjs/common';
import { AzureModule } from 'nestjs-azure-sdk';

@Module({
	imports: [
		AzureModule.forRoot({
			isGlobal: true,
			serviceBus: {
				connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING!,
			},
			blobStorage: {
				connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
			},
			queueStorage: {
				connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
			},
		}),
	],
})
export class AppModule {}
```

Cada integração também pode ser importada separadamente. Para configuração assíncrona:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServiceBusModule } from 'nestjs-azure-sdk/service-bus';

@Module({
	imports: [
		ServiceBusModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				connectionString: config.getOrThrow('AZURE_SERVICE_BUS_CONNECTION_STRING'),
			}),
		}),
	],
})
export class MessagingModule {}
```

`BlobStorageModule` e `QueueStorageModule` possuem o mesmo `forRootAsync`.

## Azure Service Bus

### Enviar para fila ou tópico

```ts
import { Injectable } from '@nestjs/common';
import { ServiceBusService } from 'nestjs-azure-sdk/service-bus';

@Injectable()
export class OrdersPublisher {
	constructor(private readonly serviceBus: ServiceBusService) {}

	async created(orderId: string): Promise<void> {
		await this.serviceBus.send('orders-created', { orderId }, { messageId: orderId, correlationId: orderId });

		await this.serviceBus.publish('order-events', {
			type: 'order.created',
			orderId,
		});
	}
}
```

Também estão disponíveis `sendMany` e `publishMany`.

### Escutar várias filas

O consumer deve ser um provider do NestJS. Uma única classe pode registrar quantos listeners forem necessários:

```ts
import { Injectable } from '@nestjs/common';
import {
	ServiceBusListener,
	ServiceBusSubscription,
	type TypedServiceBusReceivedMessage,
} from 'nestjs-azure-sdk/service-bus';

interface InvoiceMessage {
	invoiceId: string;
}

@Injectable()
export class BillingConsumer {
	@ServiceBusListener(['invoice-created', 'invoice-retry'], {
		maxConcurrentCalls: 8,
	})
	async consume(message: TypedServiceBusReceivedMessage<InvoiceMessage>): Promise<void> {
		console.log(message.body.invoiceId);
	}

	@ServiceBusSubscription('order-events', 'billing')
	async consumeEvent(message: TypedServiceBusReceivedMessage): Promise<void> {
		console.log(message.body);
	}
}
```

Por padrão, o SDK completa a mensagem quando o método termina e a abandona quando ele lança um erro. Para controlar o settlement:

```ts
@ServiceBusListener('payments', { autoComplete: false })
async consume(message: TypedServiceBusReceivedMessage, context: ServiceBusListenerContext) {
	try {
		await this.process(message.body);
		await context.complete();
	} catch (error) {
		await context.deadLetter('ProcessingError', String(error));
	}
}
```

O Service Bus move mensagens para a dead-letter queue ao atingir o limite configurado na entidade.

## Blob Storage

```ts
import { BlobStorageService } from 'nestjs-azure-sdk/blob-storage';

await blobs.uploadJson('documents', 'orders/123.json', order, {
	createContainerIfNotExists: true,
});

await blobs.upload('documents', 'receipts/123.pdf', pdfBuffer, {
	blobHTTPHeaders: { blobContentType: 'application/pdf' },
});

const order = await blobs.downloadJson<Order>('documents', 'orders/123.json');
const pdf = await blobs.download('documents', 'receipts/123.pdf');

for await (const blob of blobs.list('documents', { prefix: 'receipts/' })) {
	console.log(blob.name);
}
```

Para arquivos grandes, use `uploadStream` ou `uploadFile`.

## Queue Storage

### Enviar e receber manualmente

```ts
import { QueueStorageService } from 'nestjs-azure-sdk/queue-storage';

await queues.send('emails', { template: 'welcome', userId: '42' });

const messages = await queues.receive<EmailJob>('emails', {
	numberOfMessages: 16,
	visibilityTimeout: 60,
});

for (const message of messages) {
	await sendEmail(message.body);
	await queues.deleteMessage('emails', message);
}
```

Objetos são serializados como JSON. Use `{ raw: true }` para enviar ou receber texto sem serialização.

### Workers para múltiplas filas

```ts
import { Injectable } from '@nestjs/common';
import { QueueStorageListener, type QueueStorageMessage } from 'nestjs-azure-sdk/queue-storage';

@Injectable()
export class EmailConsumer {
	@QueueStorageListener(['email-high', 'email-normal'], {
		maxMessages: 8,
		pollIntervalInMs: 500,
		visibilityTimeoutInSeconds: 60,
		maxDequeueCount: 5,
	})
	async consume(message: QueueStorageMessage<EmailJob>): Promise<void> {
		await sendEmail(message.body);
	}
}
```

Comportamento padrão do worker:

- exclui a mensagem somente depois que o handler termina com sucesso;
- mantém a mensagem para nova tentativa quando o handler falha;
- após cinco tentativas, copia a mensagem e o erro para `<fila>-poison` e só então remove a original;
- processa até 32 mensagens por consulta e mantém um worker independente por fila;
- para com segurança durante o shutdown da aplicação.

Use `poisonQueue: false` para desabilitar a poison queue ou `poisonQueue: 'nome-customizado'` para alterar o destino. Se o handler precisar controlar exclusão ou visibilidade, configure `deleteOnSuccess: false` e use o segundo argumento `context`.

## Autenticação com identidade

Connection string é útil localmente. Em Azure, prefira identidade gerenciada e RBAC:

```ts
import { ManagedIdentityCredential } from '@azure/identity';

const credential = new ManagedIdentityCredential();

AzureModule.forRoot({
	isGlobal: true,
	serviceBus: {
		fullyQualifiedNamespace: 'my-namespace.servicebus.windows.net',
		credential,
	},
	blobStorage: { accountName: 'mystorage', credential },
	queueStorage: { accountName: 'mystorage', credential },
});
```

Se `credential` não for informado, a biblioteca cria `DefaultAzureCredential` sob demanda.

## Shutdown

Ative os hooks para que sinais do sistema encerrem receivers e workers corretamente:

```ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(3000);
```

## Testes

```bash
pnpm test
pnpm run test:coverage
pnpm run check
```

Há uma suíte opcional contra recursos reais. Ela cria entidades temporárias e as remove no final:

```bash
export AZURE_STORAGE_CONNECTION_STRING='...'
export AZURE_SERVICE_BUS_CONNECTION_STRING='...'
pnpm run test:integration
```

## Migração da versão 1

A versão 2 remove a API antiga baseada em `new Queue()` e injeção fora do contêiner do NestJS. Substitua `ServiceBusQueueModule.create(...)` por `ServiceBusModule.forRoot(...)`, use `ServiceBusService` para envio e `@ServiceBusListener()` para consumo.
