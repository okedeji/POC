import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { CorelocationService } from './corelocation.service';
import { AppLogger } from 'src/common';
import { TruckService } from '../truck/truck.service';

describe('CorelocationService', () => {
  let service: CorelocationService;

  beforeEach(async () => {
    function moockModel(dto: any) {
      this.data = dto;
      this.save  = () => {
        return this.data;
      };
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        CorelocationService, AppLogger, TruckService,
        { provide: getModelToken('TruckLocation'), useValue: moockModel },
        { provide: getModelToken('TruckRequest'), useValue: moockModel },
        { provide: getModelToken('TripHistory'), useValue: moockModel },
        { provide: getModelToken('KobocareStation'), useValue: moockModel },
        { provide: getModelToken('CustomerLocation'), useValue: moockModel },
        { provide: getModelToken('UserLocation'), useValue: moockModel },
        { provide: getModelToken('LocationHistory'), useValue: moockModel },
      ],
    }).compile();

    service = module.get<CorelocationService>(CorelocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
