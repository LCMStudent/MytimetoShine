# Solar API Setup Guide

## Current Issue: Solar API Not Working

The Solar API calls are failing because the Google Solar API requires special setup and configuration. Here's what you need to know:

## Why the Solar API Isn't Working

1. **Billing Required**: The Google Solar API is not a free service and requires billing to be enabled on your Google Cloud project
2. **API Not Enabled**: The Solar API needs to be specifically enabled in the Google Cloud Console
3. **Demo Key**: The current API key appears to be a demo/placeholder key
4. **Restrictions**: Solar API has geographic restrictions and may not be available in all regions

## How to Fix the Solar API

### Step 1: Enable Billing
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to Billing and enable billing for your project

### Step 2: Enable the Solar API
1. Go to APIs & Services > Library
2. Search for "Solar API"
3. Click on "Solar API" and enable it

### Step 3: Create or Update API Key
1. Go to APIs & Services > Credentials
2. Create a new API key or update your existing one
3. Restrict the API key to only the Solar API (for security)
4. Replace the `SOLAR_API_KEY` in `src/main.js`

### Step 4: Test the API
1. Set `USE_MOCK_SOLAR_DATA: false` in the CONFIG object in `src/main.js`
2. Test with a location in a supported region (US, some parts of Europe)

## Current Workaround

The app is currently configured to use mock solar data by default (`USE_MOCK_SOLAR_DATA: true`). This allows you to:

- Test all functionality immediately
- Get realistic solar calculations based on location and panel configuration
- See how the app works without needing to set up the Solar API

## Mock Data vs Real Data

### Mock Data (Current Setup)
- ✅ Works immediately
- ✅ Provides realistic calculations
- ✅ Uses your actual panel configuration
- ❌ Uses estimated solar irradiance values
- ❌ No real building-specific data

### Real Solar API Data
- ✅ Actual solar irradiance for the location
- ✅ Building-specific solar potential
- ✅ More accurate calculations
- ❌ Requires billing and setup
- ❌ May not be available in all regions

## Testing the Changes

The app now includes:

1. **Better Error Handling**: More specific error messages when the Solar API fails
2. **Development Mode**: Mock data flag for immediate testing
3. **Consistent Location Format**: Fixed location object format issues
4. **Enhanced Logging**: Better console logging to debug API issues

To test:
1. The app should work immediately with mock data
2. Go through the complete workflow: location → line drawing → configuration → results
3. The results will be calculated using mock solar data but your real panel configuration

## Next Steps

1. **Immediate**: The app works with mock data - you can test all features
2. **Optional**: Set up real Solar API if you need precise solar data
3. **Alternative**: Consider using other solar calculation methods or APIs if Google Solar API is not suitable

The app is now much more robust and will provide meaningful results even without the Solar API!
