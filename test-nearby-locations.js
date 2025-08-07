// Test script to verify authentication with Cheerios API and venue fetching
const axios = require('axios');
const crypto = require('crypto');

// API endpoints - Using our local proxy server
const PROXY_URL = 'http://localhost:3000'; // Local proxy server
const CHEERIOS_API_URL = 'http://localhost:8001'; // Local Cheerios service
const CLOUDHUB_API_URL = 'https://ch-api-dev-ooifid6utq-uc.a.run.app'; // CloudHub API

// Login endpoint for development
const LOGIN_ENDPOINT = '/players/mobile_login/';

// Venue fetching endpoint
const NEARBY_SITES_ENDPOINT = '/cloudhub/network/nearby_sites/';

// Test credentials
const TEST_EMAIL = 'fhankin@buzztime.com';
const TEST_PASSWORD = 'BUZZ';
const TEST_LATITUDE = 47.6062;
const TEST_LONGITUDE = -122.3321;
const MAX_SITES = 10;

// JWT secret (matching Prometheus)
const JWT_SECRET = 'secret';

// Function to generate JWT token for CloudHub API
function generateJWT(payload) {
  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // If payload is not provided, create a default payload with exp
  if (!payload) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300; // 5 minutes expiration
    payload = {
      exp: exp.toString() // Prometheus uses string for exp
    };
  }
  
  // Make sure exp is a string like in Prometheus
  if (payload.exp && typeof payload.exp === 'number') {
    payload.exp = payload.exp.toString();
  }
  
  console.log(`JWT Payload: ${JSON.stringify(payload)}`);
  
  // Create JWT parts
  const encodedHeader = Buffer.from(JSON.stringify(header))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Create signature using HMAC SHA256 with 'secret'
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Combine all parts to create the JWT
  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;
  
  return jwt;
}

// Function to authenticate with Cheerios API
async function authenticateWithCheerios(email, password) {
  const url = CHEERIOS_API_URL + LOGIN_ENDPOINT;
  console.log(`Authentication URL: ${url}`);
  
  const payload = {
    email,
    password
  };
  
  try {
    console.log(`Sending authentication request to ${url}`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Authentication response status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      // Extract auth token and other relevant data
      const authToken = response.data.token || response.data.auth_token;
      const playerId = response.data.player_id || response.data.id;
      const displayName = response.data.display_name || response.data.name;
      
      if (!authToken) {
        console.error('No auth token in response');
        console.log(`Response data: ${JSON.stringify(response.data)}`);
        return null;
      }
      
      return {
        authToken,
        playerId,
        displayName
      };
    } else {
      console.error(`Authentication failed with status ${response.status}`);
      console.log(`Response data: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.error(`Authentication error: ${error.message}`);
    if (error.response) {
      console.error(`Error status: ${error.response.status}`);
      console.error(`Error data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Function to fetch nearby venues using the auth result from Cheerios
async function fetchNearbyVenues(authResult) {
  console.log('\n==== Fetching nearby venues ====');
  
  if (!authResult || !authResult.authToken) {
    console.error('No auth token available for venue fetching');
    return null;
  }
  
  const authToken = authResult.authToken;
  const latitude = TEST_LATITUDE;
  const longitude = TEST_LONGITUDE;
  const maxSites = MAX_SITES;
  
  // First try using our local proxy endpoint
  console.log('Trying local proxy endpoint first...');
  const proxyResult = await tryFetchVenuesViaProxy(authToken, latitude, longitude, maxSites);
  if (proxyResult) {
    console.log('Successfully fetched venues via local proxy!');
    return proxyResult;
  }
  
  // If proxy fails, fall back to direct CloudHub API
  console.log('Proxy failed, falling back to direct CloudHub API...');
  return await tryFetchVenues(authToken, latitude, longitude, maxSites);
}

// Helper function to try fetching venues via our local proxy
async function tryFetchVenuesViaProxy(authToken, latitude, longitude, maxSites) {
  const url = `${PROXY_URL}/cloudhub/network/nearby_sites/`;
  console.log(`Proxy URL: ${url}`);

  const payload = {
    latitude,
    longitude,
    max_sites: maxSites,
    isMockLocationFlag: false,
    auth_token: authToken // Pass the auth token in the request body
  };
  console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    console.log(`Sending request to proxy: ${url}`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'web-client' // Identify as web client
      }
    });

    console.log(`Proxy response status: ${response.status}`);
    console.log(`Found ${response.data.length} venues via proxy`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    console.log(`Proxy API error: ${error.message}`);
    if (error.response) {
      console.log(`Error status: ${error.response.status}`);
      console.log(`Error data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Helper function to try fetching venues directly from CloudHub API
async function tryFetchVenues(authToken, latitude, longitude, maxSites) {
  const url = CLOUDHUB_API_URL + NEARBY_SITES_ENDPOINT;
  console.log(`Direct CloudHub URL: ${url}`);

  // Generate JWT token with auth_token in payload
  const jwtPayload = { exp: Math.floor(Date.now() / 1000) + 300, auth_token: authToken };
  console.log(`JWT Payload: ${JSON.stringify(jwtPayload)}`);
  const jwt = generateJWT(jwtPayload);
  console.log(`Generated JWT: ${jwt}`);

  const payload = {
    latitude,
    longitude,
    max_sites: maxSites,
    isMockLocationFlag: false
  };
  console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    console.log(`Request URL: ${url}`);
    console.log(`Using JWT: ${jwt}`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': jwt
      }
    });

    console.log(`Venue API response status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    console.log(`Venue API error: ${error.message}`);
    if (error.response) {
      console.log(`Error status: ${error.response.status}`);
      console.log(`Error data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Main function to run the test
async function main() {
  console.log('Starting authentication and venue fetching test...');
  
  console.log(`Using Cheerios API: ${CHEERIOS_API_URL}`);
  console.log(`Using login endpoint: ${LOGIN_ENDPOINT}`);
  console.log(`Using CloudHub API: ${CLOUDHUB_API_URL}`);
  
  // Try to authenticate
  const authResult = await authenticateWithCheerios(TEST_EMAIL, TEST_PASSWORD);
  
  if (authResult && authResult.authToken) {
    console.log('\n==== Authentication successful ====');
    console.log(`Auth Token: ${authResult.authToken}`);
    console.log(`Player ID: ${authResult.playerId}`);
    console.log(`Display Name: ${authResult.displayName}`);
    console.log(`Using API URL: ${CHEERIOS_API_URL}`);
    console.log('===============================\n');
    
    // Fetch nearby venues using the auth result
    const venuesResult = await fetchNearbyVenues(authResult);
    
    if (venuesResult) {
      console.log('\n==== Venue Fetching successful ====');
      console.log(`Found ${venuesResult.length} venues`);
    } else {
      console.log('\n==== Venue Fetching failed ====');
    }
  } else {
    console.log('\n==== Authentication failed ====');
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
});
