import { Controller, Post, Body } from '@nestjs/common';

import { KoboCareService } from './kobo-care.service';
import { KobocareStationDTO, Response, Helpers } from '../../../common';
import { AppLogger } from '../../../common';

@Controller('/kobocare')
export class KoboCareController {

    constructor( 
        private readonly kobocareService: KoboCareService,
        private readonly logger: AppLogger
    ){}

    @Post('/stations')
    async kobocareStation (@Body() body: KobocareStationDTO): Promise<Response> {
    try {
      const saved = await this.kobocareService.saveKobocareStation(body)
      this.logger.log('Saved into the Kobocare stations DB')

      return Helpers.sendJsonResponse({saved}, "saved kobocare station successfully");
    } catch (error) {
      throw Error('Error occured while saving kobocare stations')
    }
  }

}
