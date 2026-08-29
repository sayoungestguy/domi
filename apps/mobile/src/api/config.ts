import { Platform } from 'react-native';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const developmentBaseUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const apiBaseUrl = configuredBaseUrl ?? developmentBaseUrl;
export const cableUrl = `${apiBaseUrl.replace(/^http/, 'ws')}/cable`;
