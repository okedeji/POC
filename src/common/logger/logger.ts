/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { LoggerService, Logger } from '@nestjs/common';
// import {configure, getLogger, Logger as Logger4Js} from "log4js";

export class AppLogger extends Logger implements LoggerService {

  constructor() {
      super();
  }

  log(message: string) {
    super.log(message);
  }

  error(message: string, trace: string) {
    super.error(message, trace);
    console.error(message);
    console.error(trace);
  }

  warn(message: string) {
    super.warn(message);
  }

  debug(message: string) {
    super.debug(message);
    console.debug(message);
  }

  verbose(message: string) {
    super.verbose(message);
    console.log(message);
  }
}