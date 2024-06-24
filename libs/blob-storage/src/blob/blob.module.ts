import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageClientModule } from '../client/client.module';
import { BlobService } from './blob.service';

@Module({
	imports: [ConfigModule, StorageClientModule],
	providers: [BlobService],
	exports: [BlobService]
})
export class BlobModule {}
