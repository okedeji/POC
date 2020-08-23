import { Test, TestingModule } from '@nestjs/testing';
import { MessageProvider } from './message-provider';

describe('MessageProvider', () => {
  let provider: MessageProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageProvider],
    }).compile();

    provider = module.get<MessageProvider>(MessageProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
