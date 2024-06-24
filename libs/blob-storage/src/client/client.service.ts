import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageClientService {
  private instance: BlobServiceClient;

  constructor(private readonly configService: ConfigService) {}

  public getInstance() {
    if (!this.instance) {
      this.instance = this.initClient();
    }
    return this.instance;
  }

  private initClient() {
    const urlConnection = this.configService.get<string>(
      'URL_STORAGE_CONNECTION',
    );
    const tokenConnection = this.configService.get<string>(
      'TOKEN_STORAGE_CONNECTION',
    );
    const accountName = this.configService.get<string>('STORAGE_ACCOUNT_NAME');
    if (!tokenConnection || !urlConnection || !accountName)
      throw Error('Azure Storage Enviroments not found');
    const credentials = new StorageSharedKeyCredential(
      accountName,
      tokenConnection,
    );
    return new BlobServiceClient(urlConnection, credentials);
  }
}
