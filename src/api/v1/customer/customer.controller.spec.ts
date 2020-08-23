import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerModule } from './customer.module';

describe('Customer Controller', () => {
  let controller: CustomerController;

  beforeEach(async () => {
    function mockCustomerLocationrModel(dto: any) {
      this.data = dto;
      this.save  = () => {
        return this.data;
      };
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [ CustomerModule ],
      controllers: [CustomerController],
      providers: [
        CustomerService,
        {
          provide: getModelToken('CustomerLocation'),
          useValue: mockCustomerLocationrModel,
        },
      ]
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
