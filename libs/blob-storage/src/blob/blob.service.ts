import { BlobServiceClient } from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFParser from 'pdf-parse';
import { StorageInterface } from 'src/interfaces/storage-download-file.interface';
import { StorageClientService } from '../client/client.service';

@Injectable()
export class BlobService implements StorageInterface {
  private readonly storageClient: BlobServiceClient;
  private containerName: string;

  constructor(
    private readonly storageClientService: StorageClientService,
    private readonly configService: ConfigService,
  ) {
    this.storageClient = this.storageClientService.getInstance();
    this.containerName = this.configService.get<string>(
      'STORAGE_CONTAINER_NAME',
    );
  }

  async readFile(fileName: string): Promise<string> {
    try {
      const blobClient = this.storageClient
        .getContainerClient(this.containerName)
        .getBlobClient(fileName);

      const downloadResponse = await blobClient.downloadToBuffer();
      const buffer = downloadResponse as Buffer;

      const pdfText = await PDFParser(buffer);

      return pdfText.text;
    } catch (error) {
      console.error('Erro ao ler o PDF:', error);
      throw error;
    }
  }
}
