const appJson = require('./app.json');

// Expo Go and store builds read this at bundle time. Leave it unset to keep
// the local API. Set EXPO_PUBLIC_API_URL to the deployed Vercel API origin
// (no trailing slash) when a device build should call that API.
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl,
    },
  },
};
