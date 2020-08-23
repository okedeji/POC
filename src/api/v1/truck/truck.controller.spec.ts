import { Test, TestingModule } from '@nestjs/testing';
import { TruckController } from './truck.controller';

describe('Truck Controller', () => {
  let controller: TruckController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TruckController],
    }).compile();

    controller = module.get<TruckController>(TruckController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
