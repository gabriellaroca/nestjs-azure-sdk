import { DynamicModule, Module } from '@nestjs/common';
import { ServiceBusClientModule } from '../client/client.module';
import { ClientOptions } from '../type/client';
import { ServiceBusQueueService } from './queue.service';

@Module({})
export class ServiceBusQueueModule {
	static create(options: ClientOptions): DynamicModule {
		return {
			module: ServiceBusQueueModule,
			imports: [ServiceBusClientModule.createClient(options)],
			providers: [ServiceBusQueueService],
			exports: [ServiceBusQueueService],
		};
	}
}
