import { Test, TestingModule } from '@nestjs/testing';
import { ServiceBusService } from './service-bus.service';

describe('ServiceBusService', () => {
  let service: ServiceBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceBusService],
    }).compile();

    service = module.get<ServiceBusService>(ServiceBusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
