import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserLocationSchema, UserLocationHistorySchema } from '@kobotech/geo-schema';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GoogleModule } from '../google/google.module';
import { CommonModule } from 'src/common';
import { CorelocationModule } from '../corelocation/corelocation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UserLocation', schema: UserLocationSchema },
      { name: 'UserLocationHistory', schema: UserLocationHistorySchema },
    ]),
    CorelocationModule,
    GoogleModule,
    CommonModule
  ],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
