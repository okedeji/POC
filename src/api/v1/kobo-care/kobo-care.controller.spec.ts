import { Test, TestingModule } from '@nestjs/testing';
import { KoboCareController } from './kobo-care.controller';

describe('KoboCare Controller', () => {
  let controller: KoboCareController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KoboCareController],
    }).compile();

    controller = module.get<KoboCareController>(KoboCareController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
