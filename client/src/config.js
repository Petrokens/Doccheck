export const API_URLS = {
  development: 'http://localhost:5000/api',
  production: 'https://your-qaqc-api.example.com/api',
};

export const API_BASE_URL = import.meta.env.PROD ? API_URLS.production : API_URLS.development;
