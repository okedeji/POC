import { registerAs } from "@nestjs/config";

export default registerAs('mqtt', () => ({
    url:  `mqtt://${process.env.CLOUDMQTT_USER}:${process.env.CLOUDMQTT_PASS}@${process.env.CLOUDMQTT_URL}:${process.env.CLOUDMQTT_PORT}`
}));