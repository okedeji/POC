import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { Helpers } from '../helpers/utitlity.helpers';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private readonly reflector: Reflector){}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    const isPublic = this.reflector.get<boolean>( "isPublic", context.getHandler() );
    if ( isPublic ) {
			return true;
		}
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  private async  validateRequest(req): Promise<boolean> {
    if(!req.header('Authorization')){
      Helpers.sendErrorResponse({}, "Authorization token not passed, please pass one", 'UNAUTHORIZED');
      return
    }

    const token = req.header("Authorization").split(" ")[1];

    let response;
    try {
      response =  await Helpers.sendPostRequest('core', '/user/decodeToken', {token}, '');
    } catch (error) {
      Helpers.sendErrorResponse({error}, "User authorization failed", 'UNAUTHORIZED');
      return 
    }

    req.user = response;
    return true
  }

}
