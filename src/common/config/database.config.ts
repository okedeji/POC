import {registerAs} from '@nestjs/config';

export default registerAs('database', () => ({
    dbUrl: `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&authSource=admin`
}));
