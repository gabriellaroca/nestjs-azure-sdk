import { Test, TestingModule } from '@nestjs/testing';
import { BlobStorageService } from './blob-storage.service';

describe('BlobStorageService', () => {
  let service: BlobStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlobStorageService],
    }).compile();

    service = module.get<BlobStorageService>(BlobStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
