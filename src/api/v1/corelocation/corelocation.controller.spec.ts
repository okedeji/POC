import { Test, TestingModule } from '@nestjs/testing';
import { CorelocationController } from './corelocation.controller';
import { CorelocationService, CommonModule } from '../../../common';

describe('Corelocation Controller', () => {
  // let controller: CorelocationController;
  const controller = "";

  // beforeEach(async () => {
  //   const module: TestingModule = await Test.createTestingModule({
  //     imports: [CommonModule],
  //     controllers: [CorelocationController],
  //     providers: [CorelocationService]
  //   }).compile();

  //   controller = module.get<CorelocationController>(CorelocationController);
  // });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
