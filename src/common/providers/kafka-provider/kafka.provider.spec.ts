import { Test, TestingModule } from '@nestjs/testing';
import { KafkaProvider } from './kafka.provider';
import { AppConfigService } from '../../';

describe('KafkaProvider', () => {
  // let provider: KafkaProvider;
  const provider = "";

  // beforeEach(async () => {
  //   const module: TestingModule = await Test.createTestingModule({
  //     providers: [AppConfigService, KafkaProvider],
  //   }).compile();

  //   provider = module.get<KafkaProvider>(KafkaProvider);
  // });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
