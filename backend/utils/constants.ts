const isProdEnv = process.env.NODE_ENV === 'production';
const PROD_URL = '';
const DEV_URL = 'http://localhost:5000';

export const IS_RECONNECTION_ENABLED = true;
export const RECONNECT_DELAY_MIN = 1000;
export const RECONNECT_DELAY_MAX = 5000;
