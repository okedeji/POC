import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

import { Response } from '../classes';

export class Helpers {


    /**
     * Sends default JSON resonse to client
     * @param {*} res
     * @param {*} content
     * @param {*} message
     */
    static sendJsonResponse (content: Record<string, unknown>, message: string): Response {
        const data = {
            success: true,
            message,
            data: content
        };
        return data;
    }

    /**
     * Sends error resonse to client
     * @param {*} content
     * @param {*} message
     * @param {*} status
     */
    static sendErrorResponse (content: Record<string, unknown>, message: string, status: string): Response {
        const data = {
            success: false,
            message,
            data: content
        }

        throw new HttpException(data, HttpStatus[status])
    }
    /**
     * Capitalize a string
     * @param  {string} s
     * @returns string
     */
    static capitalize (s: string): string {
        return s.charAt(0).toUpperCase() + s.slice(1)
    }
    /**
     * Helps formmat Seconds to HMS
     * @param  {number} seconds
     * @returns string
     */
    static formatToHMS(seconds: number): string {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);
  
        const dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : '';
        const hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : '';
        const mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : '';
        const sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : '';
  
        return dDisplay + hDisplay + mDisplay + sDisplay;
    }

    /**
     * helps send a post request with the help of axios
     * @param  {} type='core'||'geo'
     * @param  {string} path
     * @param  {any} data
     * @param  {string} token
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    static async sendPostRequest (type = 'core' || 'geo', path: string, data:any, token:string): Promise<any> {
        let baseUrl: string;
        if(type === 'core'){
            baseUrl = process.env['AUTH_URL'];
        }else if(type === 'geo') {
            baseUrl = process.env['GEO_URL'];
        }

        const response = await (await axios.post(`${baseUrl}${path}`, data, { 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })).data

        if(!response.success){
             console.log(response.message)
             return null
        }

        return response.data
    }
    /**
     * help send a get request with the help of axios
     * @param  {} type='core'||'geo'
     * @param  {string} path
     * @param  {} token
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    static async sendGetRequest (type = 'core' || 'geo', path: string, token): Promise<any> {
        let baseUrl: string;
        if(type === 'core'){
            baseUrl = process.env['AUTH_URL'];
        }else if(type === 'geo') {
            baseUrl = process.env['GEO_URL'];
        }

        const response = await (await axios.get(`${baseUrl}${path}`, { 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }  
        })).data;

        if(!response.success){
            console.log(response.message)
            return null
       }

       return response.data
    }
}
