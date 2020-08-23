import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsDateString } from 'class-validator';

export class Autocomplete {
    @IsOptional() @IsString() source: string;
    @IsString() readonly input: string;
}

export class ReverseGeocodeQuery {
    @IsOptional() @IsString() source: string;
    @IsString() readonly lat: string;
    @IsString() readonly lng: string
}

export class PlaceQuery {
    @IsOptional() @IsString() source: string;
    @IsString() readonly placeId: string;
}

export class DirectionsQuery {
    @IsOptional() @IsString() source: string;
    @IsString() readonly sourceLatitude: string;
    @IsString() readonly sourceLongitude: string;
    @IsString() readonly destinationLatitude: string;
    @IsString() readonly destinationLongitude: string;
}


export class AssetClassDTO {
    @IsString() readonly id: string;
    @IsString() readonly  type: string;
    @IsNumber() readonly  size: number;
    @IsString() readonly  unit: string;
}

export class AvailableTrucksQuery {
    @IsString() readonly currentLat: string;
    @IsString() readonly currentLng: string;
    @IsOptional() @IsString() readonly assetType: string;
    @IsOptional() @IsString() readonly radius: string;
    @IsOptional() @IsString() readonly destinationLat: string;
    @IsOptional() @IsString() readonly destinationLng: string;
    @IsOptional() @IsString() readonly page: string;
    @IsOptional() @IsString() readonly limit: string;
    @IsOptional() @IsString() readonly tracked: string;
    @IsOptional() @IsString() readonly country: string;
    @IsOptional() @IsString() readonly live: string;
}

export class OverviewQuery {
    @IsString() readonly lat: string;
    @IsString() readonly lng: string;
    @IsOptional() @IsString() readonly partnerId: string;
    @IsOptional() @IsString() readonly customerId: string;
    @IsOptional() @IsString() readonly tracked: string;
    @IsOptional() @IsString() readonly country: string;
    @IsOptional() @IsString() readonly live: string;
}


export class LocationDto {
    @IsNumber() readonly type: string;
    @IsArray() readonly  coordinates: [number, number];
    @IsString() readonly  geohash: string;
    @IsString() readonly  address: string;
    @IsOptional() @IsNumber() readonly  bearing: number;
    @IsOptional() @IsNumber() readonly  speed: number;
    @IsOptional() @IsString() readonly  timestamp: Date;
}

export class ActionListDto {
    @IsDateString() readonly dateTime: Date;
    @IsObject() readonly location: LocationDto;
    @IsString() readonly reason: string;
}


export class DriverDto {
    @IsNumber() readonly id: number;
    @IsString() readonly  mobile: string;
    @IsString() readonly  firstName: string;
    @IsString() readonly  lastName: string;
}
export class PartnerDto {
    @IsNumber() readonly id: number;
    @IsString() readonly  mobile: string;
    @IsString() readonly  businessName: string;
}

export class CustomerDto {
    @IsNumber() readonly id: number;
    @IsString() readonly  mobile: string;
    @IsString() readonly  businessName: string;
    @IsOptional() @IsString() readonly  businessUnit: string;
}

export class UserDto {
    @IsNumber() readonly id: number;
    @IsString() readonly firstName: string;
    @IsString() readonly lastName: string;
    @IsString() readonly mobile: string;
    @IsString() readonly image?: string;
    @IsNumber() readonly rating?: number;
    @IsNumber() readonly level?: number;
    @IsString() readonly pushToken?: string;
}

export class ETADto {
    @IsNumber() readonly value: number;
    @IsString() readonly text: string;
}

export class ActivePartnerDTO {
    @IsNumber() readonly id: number;
    @IsString() readonly name: string;
}

export class TripDetailDto {
    @IsString() readonly tripId: string;
    @IsString() readonly tripReadId: string;
    @IsString() readonly tripStatus: string;
    @IsString() readonly transportStatus: string;
    @IsString() readonly overviewStatus: string;
    @IsOptional() @IsString() trackStatus: string;
    @IsBoolean() readonly delivered: boolean;
    @IsObject() readonly expectedETA: ETADto;
    @IsObject() readonly currentETA: ETADto;
    @IsNumber() readonly totalDistance: number;
    @IsNumber() readonly remainingDistance: number;
    @IsString() readonly goodType: string;
    @IsString() readonly goodCategory: string;
    @IsOptional() @IsString() readonly KoboBusinessUnitTag: string;
    @IsObject() readonly pickupLocation: LocationDto;
    @IsObject() readonly deliveryLocation: LocationDto
    @IsOptional() @IsArray() readonly dropOffs: [LocationDto]
    @IsString() readonly sourceCountry: string;
    @IsString() readonly deliveryCountry: string;
    @IsString() readonly requestCountry: string;
    @IsString() readonly source: string;
    @IsString() readonly destination: string;
    @IsOptional() @IsObject() readonly whiteListedStop: ActionListDto;
    @IsOptional() @IsObject() readonly blacklistedStop: ActionListDto;
    @IsOptional() @IsObject() readonly diversion: ActionListDto;
    @IsBoolean() readonly diverted: boolean;
    @IsBoolean() readonly flagged: boolean;
    @IsObject() readonly partnerId: number;
    @IsObject() readonly partnerName: string;
    @IsObject() readonly partnerMobile: string;
    @IsObject() readonly partnerPushToken: string;
    @IsObject() readonly driverId: number;
    @IsObject() readonly driverMobile: string;
    @IsObject() readonly driverName: string;
    @IsObject() readonly driverPushToken: string;
    @IsObject() readonly customerId: number;
    @IsObject() readonly customerName: string;
    @IsObject() readonly customerMobile: string;
    @IsObject() readonly customerEmail: string;
    @IsObject() readonly customerPushToken: string;
    @IsString() readonly travelledRoutePolyline: string;
    @IsString() readonly bestRoutePolyline: string;
    @IsString() readonly currentBestRoutePolyline: string;
}

export class TrackTruckDto {
    
    @IsOptional() @IsString()  provider: string;
    @IsOptional() @IsString() imei: string;
    @IsString() regNumber: string;
    @IsObject()  assetClass: AssetClassDTO;
    @IsBoolean() available: boolean;
    @IsBoolean() onTrip: boolean;
    @IsNumber() millage: number;
    @IsNumber() speed: number;
    @IsNumber() bearing: number;
    @IsString() geohash: string;
    @IsString() source: string;
    @IsObject() lastKnownLocation: LocationDto;
    @IsOptional() @IsArray() locations: [LocationDto];
    @IsObject() activePartner: ActivePartnerDTO;
    @IsObject() driver: DriverDto;
    @IsOptional() @IsString() country: string;
    @IsOptional() @IsObject()  tripDetail: TripDetailDto;
    @IsString() @IsOptional() Authtoken: string;
}

export class LocationHistoryDto {
    
    @IsOptional() @IsString() readonly provider: string;
    @IsOptional() @IsString() readonly imei: string;
    @IsString() readonly regNumber: string;
    @IsOptional() @IsString() readonly tripId: string;
    @IsObject() readonly assetClass: AssetClassDTO;
    @IsOptional() @IsNumber() readonly speed: number;
    @IsOptional() @IsNumber() readonly bearing: number;
    @IsOptional() @IsNumber() readonly customerId: number;
    @IsOptional() @IsNumber() readonly driverId: number;
    @IsOptional() @IsNumber() readonly partnerId: number;
    @IsString() readonly geohash: string;
    @IsString() readonly source: string;
    @IsObject() readonly location: LocationDto;
    @IsOptional() @IsString() readonly country: string;
    @IsOptional() @IsString() readonly truckStatus: string;
}

export class ActiveTripsDTO {
    @IsOptional() @IsString() readonly lat: string;
    @IsOptional() @IsString() readonly lng: string;
    @IsOptional() @IsString() readonly partnerId: string;
    @IsOptional() @IsString() readonly customerId: string;
    @IsOptional() @IsString() readonly status: string;
    @IsOptional() @IsString() readonly page: string;
    @IsOptional() @IsString() readonly limit: string;
    @IsOptional() @IsString() readonly tracked: string;
    @IsOptional() @IsString() readonly country: string;
    @IsOptional() @IsString() readonly live: string;
}

export class TrucksDTO {
    @IsOptional() @IsString() readonly partnerId: string;
    @IsOptional() @IsString() readonly customerId: string;
    @IsOptional() @IsString() readonly page: string;
    @IsOptional() @IsString() readonly limit: string;
    @IsOptional() @IsString() readonly tracked: string;
    @IsOptional() @IsString() readonly country: string;
    @IsOptional() @IsString() readonly live: string;
}

export class CustomerLocationDTO {
    @IsNumber() readonly customer_id: number;
    @IsString() readonly customer_name: string;
    @IsString() readonly name: string;
    @IsString() readonly address: string;
    @IsString() readonly state: string;
    @IsNumber() readonly lat: number;
    @IsNumber() readonly long: number;
    @IsString() readonly country: string;
    @IsString() readonly geohash: string;
    @IsNumber() readonly radius: number;
    @IsString() readonly contact_name: string;
    @IsString() readonly contact_phone: string;
    // add station ID as a unique
}

export class KobocareStationDTO {
    @IsNumber() vendorId: number;
    @IsString() vendorName: string;
    @IsNumber() stationId: number;
    @IsString() name: string;
    @IsString() address: string;
    @IsString() state: string;
    @IsString() country: string;
    @IsNumber() lat: number;
    @IsNumber() lng: number;
    @IsOptional() @IsString() contactName: string;
    @IsOptional() @IsString() contactPhone: string;
}

export class TruckRequestDTO {
    @IsString() id: string;
    @IsNumber() customerId: number;
    @IsString() customerName: string;
    @IsNumber() pickupLat: number;
    @IsNumber() pickupLng: number;
    @IsString() pickupAddress: string;
    @IsOptional() @IsNumber() deliveryLat: number;
    @IsOptional() @IsNumber() deliveryLng: number;
    @IsOptional() @IsString() deliveryAddress: string;
    @IsObject() assetClass: any;
}

export class AvailableOrdersQuery {
    @IsString() lat: string;
    @IsString() lng: string;
    @IsOptional() @IsString() tracked: string;
    @IsOptional() @IsString() readonly country: string;
    @IsOptional() @IsString() readonly live: string;
}

export class TripUpdateDTO {
    @IsString() tripId: string;
    @IsString() status: string;
    @IsString() regNumber: string;
    @IsString() @IsOptional() transportStatus: string;
    @IsObject() token: {
        Authtoken: string;
    };
    @IsString() @IsOptional() loadedDate: string;
    @IsString() @IsOptional() transportDate: string;
    @IsString() @IsOptional() dateDelivered: string;
}

export class UserLocationDTO {
    @IsNumber() userId: number;
    @IsNumber() lat: number;
    @IsNumber() lng: number;
    @IsString() userType: string;
    @IsString() email: string;
    @IsString() firstName: string;
    @IsString() lastName: string;
    @IsString() mobile: string;
}

export class UserLocationsQuery {
    @IsOptional() @IsString() userType: string;
    @IsOptional() @IsString() lat: string;
    @IsOptional() @IsString() lng: string;
    @IsOptional() @IsString() tracked: string;
    @IsOptional() @IsString()  country: string;
    @IsOptional() @IsString() live: string;
}

export class CreateTruckDTO {
    @IsString() regNumber: string;
    @IsObject() token: {
        Authtoken: string;
    };
}

export class locationUpdateDTO {
    @IsNumber() lat: number;
    @IsNumber() long: number;
    @IsString() address: string;
    @IsString() reg_number: string;
}

export class SearchQuery {
    @IsString() searchTerm: string;
    @IsString() limit: string;
    @IsOptional() @IsString() partnerId: string;
    @IsOptional() @IsString() customerId: string;
    @IsOptional() @IsString() tracked: string;
    @IsOptional() @IsString() country: string;
    @IsOptional() @IsString() live: string;
}

export class SetToAvailable {
    @IsString() regNumber: string;
}

export class CongestionParam {
    @IsString() regNumber: string;
}

export class UserLocationParam {
    @IsNumber() userId: number;
}