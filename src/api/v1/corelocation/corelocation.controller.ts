import { Controller, Get, Redirect, Query, Post, Body, Headers, Param, Put } from '@nestjs/common';

import { CorelocationService } from './corelocation.service'
import { AppLogger } from '../../../common';
import { MessageProvider } from '../../../mqttserver';
import { 
  Response, Helpers, AvailableTrucksQuery, OverviewQuery, ActiveTripsDTO, SearchQuery, SetToAvailable, 
  AvailableOrdersQuery, TripUpdateDTO, Public, locationUpdateDTO, TrackTruckDto, CongestionParam,
} from '../../../common/';

@Controller()
export class CorelocationController {
  constructor(
    private readonly corelocationService: CorelocationService,
    private mqttMsgProvider: MessageProvider,
    private logger: AppLogger
  ) { }

  @Get('/docs')
  @Redirect('https://documenter.getpostman.com/view/8785734/Szzn6Gcw?version=latest')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getDocs(): void { }

  @Get('/availableTrucks')
  async avaiableTrucks(@Query() query: AvailableTrucksQuery): Promise<Response> {
    try {
      const trucks = await this.corelocationService.avaiableTrucks(query);
      return Helpers.sendJsonResponse({ trucks }, "Available trucks gotten successfully");
    } catch (error) {
        throw Error(error);
    }
  }

  @Get('/availableOrder')
  async availableOrders(@Query() query: AvailableOrdersQuery): Promise<Response> {
    try {
      const orders = await this.corelocationService.availableOrders(query);
      return Helpers.sendJsonResponse({ orders }, "Available orders gotten successfully");
    } catch (error) {
      throw Error(error);
    }
  }

  @Public()
  @Post('/track')
  async trackTruck (@Body() trackData: TrackTruckDto): Promise<boolean> {
    trackData.source = trackData.source.toLowerCase();
    trackData.regNumber = trackData.regNumber.toUpperCase();

    const trackStatus = await this.corelocationService.checkTripStatus(trackData.regNumber, trackData);
    trackData.tripDetail.trackStatus = trackStatus;

    const saved = await this.corelocationService.saveLocation(trackData);
    this.logger.log(`save location data ${!!saved}`);

    await this.corelocationService.updateTripAndTruck(trackData);
    this.logger.log('Updated the trip/truck on core');

    this.mqttMsgProvider.emitClientTrack(trackData.regNumber, trackData);
    return true;
  }

  @Get('/')
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async overview(@Headers() headers, @Query() query: OverviewQuery): Promise<Response> {
    try {
        const token = headers['authorization'].split(' ')[1];
        const overview = await this.corelocationService.overview(query, token);
        return Helpers.sendJsonResponse({overview}, "Overview data gotten successfully");
    } catch (error) {
      throw Error(error);
    }
  }

  @Get('/activeTrips')
  async activeTrips(@Query() query: ActiveTripsDTO): Promise<Response> {
    try {
      const trips = await this.corelocationService.activeTrips(query);
      return Helpers.sendJsonResponse({ trips }, "active trips data gotten successfully");
    } catch (error) {
      throw Error(error);
    }
  }

  @Get('/trucks')
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async trucks (@Headers() headers, @Query() query: ActiveTripsDTO): Promise<Response> {

    if(query.customerId && query.partnerId){
      return Helpers.sendErrorResponse({}, "You cannot pass partner Id and customer Id at the smae time", 'BAD_REQUEST')
    }

    try {
        const token = headers['authorization'].split(' ')[1];
        const trucks = await this.corelocationService.trucks(query, token);
        return Helpers.sendJsonResponse({trucks}, "trucks data gotten successfully");
    } catch (error) {
      throw Error(error);
    }
  }

  @Put('/tripUpdate')
  async tripUpdate (@Body() body: TripUpdateDTO): Promise<Response> {
    body.regNumber = body.regNumber.toUpperCase();
    try {
      const updated = await this.corelocationService.updateTrip(body);
      if(updated){
        this.logger.log(`trip ${body.tripId} on truck ${body.regNumber} had just been updated`);
      }
      else this.logger.warn(`Unable to update trip ${body.tripId} on truck ${body.regNumber}`);

      return Helpers.sendJsonResponse({}, "saved Truck request successfully");
    } catch (error) {
      throw Error(error);
    }
  }

  @Get('/congestions/:regNumber')
  async congestions (@Param() params: CongestionParam ): Promise<Response> {
    const congestions = await this.corelocationService.getCongestions(params.regNumber);
    if(!congestions.status){
      return Helpers.sendErrorResponse({}, congestions.message, 'NOT_FOUND');
    }
    else {
      return Helpers.sendJsonResponse({congestions: congestions.data}, "congestions gotten succesfully");
    }
    
  }

  @Get('/search')
  async search (@Query() query: SearchQuery ): Promise<Response> {
    const result = await this.corelocationService.search(query);
   
    return Helpers.sendJsonResponse({result}, "search done succesfully");
  }

  @Put('/updateLocation')
  async locationUpdate (@Body() body: locationUpdateDTO): Promise<Response> {
    
    const updated = await this.corelocationService.updateLocation(body);
    if(updated){
      this.logger.log(`location on truck ${body.reg_number} had just been updated`);
      return Helpers.sendJsonResponse({}, `location on truck ${body.reg_number} had just been updated`);
    }
    else {
      this.logger.warn(`Unable to update tocation on truck ${body.reg_number}`);
      return Helpers.sendErrorResponse({}, `Unable to update tocation on truck ${body.reg_number}`, 'BAD_REQUEST')
    }
  }

  @Put('/setToAvailable')
  async setToAvailable (@Body() body: SetToAvailable): Promise<Response> {
    
    const updated = await this.corelocationService.setToAvailable(body);
    if(updated){
      this.logger.log(`Truck ${body.regNumber} had just been set to available`);
      return Helpers.sendJsonResponse({}, `Truck ${body.regNumber} had just been set to available`);
    }
    else {
      this.logger.warn(`Unable to set truck ${body.regNumber} to available`);
      return Helpers.sendErrorResponse({}, `Unable to set truck ${body.regNumber} to available`, 'BAD_REQUEST')
    }
  }

}
