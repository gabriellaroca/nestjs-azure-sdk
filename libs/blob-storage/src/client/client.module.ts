import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageClientService } from './client.service';

@Module({
	imports: [ConfigModule],
	providers: [StorageClientService],
	exports: [StorageClientService]
})
export class StorageClientModule {}
