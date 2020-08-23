import { Test, TestingModule } from '@nestjs/testing';
import { KoboCareService } from './kobo-care.service';

describe('KoboCareService', () => {
  let service: KoboCareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KoboCareService],
    }).compile();

    service = module.get<KoboCareService>(KoboCareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
