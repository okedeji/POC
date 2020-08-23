export interface TrackerTruck {
    id?: string;
    provider: string;
    imei: string;
    type: string;
    msisdn: string;
    millage: string;
    country: string;
    registeredDate?: string;
    regNumber: string;
    lastconnectionTime: string;
    assignedHistory: assignedHistory[];
    lastLocation: string[];
}

interface assignedHistory {
    regNumber: string;
    date: string;
    time: string
}

export interface Response {
    success: boolean,
    message: string,
    data: Record<string, unknown>
}

export interface KafkaMessage {
    value: string | Buffer,
    key: string
}
export interface FilterInput {
    assetClass?: string
}
