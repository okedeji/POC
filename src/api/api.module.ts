import { Module } from '@nestjs/common';

import { KoboCareModule, GoogleModule, CustomerModule, UserModule, TruckModule, CorelocationModule } from './v1';
import { CommonModule } from 'src/common';

@Module({
    imports: [ CommonModule, KoboCareModule, GoogleModule, CustomerModule, TruckModule, UserModule, CorelocationModule ],
})
export class ApiModule {}
