import { Test, TestingModule } from '@nestjs/testing';
import { MessageControllerController } from './message-controller.controller';

describe('MessageController Controller', () => {
  let controller: MessageControllerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageControllerController],
    }).compile();

    controller = module.get<MessageControllerController>(MessageControllerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
