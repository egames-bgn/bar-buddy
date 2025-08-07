// Simple test script for nearby locations proxy endpoint with auth token
const axios = require('axios');

// Proxy server URL
const PROXY_URL = 'http://localhost:3000';
const NEARBY_SITES_ENDPOINT = '/cloudhub/network/nearby_sites/';

// Test data
const TEST_LATITUDE = 33.1581;
const TEST_LONGITUDE = -117.3506;
const MAX_SITES = 10;
const AUTH_TOKEN = 'dev-auth-token'; // Using the default token that the proxy expects

async function testNearbyLocations() {
  const url = `${PROXY_URL}${NEARBY_SITES_ENDPOINT}`;
  console.log(`Testing proxy endpoint: ${url}`);
  
  const payload = {
    latitude: TEST_LATITUDE,
    longitude: TEST_LONGITUDE,
    max_sites: MAX_SITES,
    isMockLocationFlag: false
  };
  
  console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);
  
  try {
    console.log(`Sending request to proxy...`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'web-client',
        'Auth-Token': AUTH_TOKEN // Include auth token in headers
      }
    });
    
    console.log(`Proxy response status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    console.log(`Proxy error: ${error.message}`);
    if (error.response) {
      console.log(`Error status: ${error.response.status}`);
      console.log(`Error data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

// Run the test
testNearbyLocations().catch(error => {
  console.error('Unhandled error:', error);
});
