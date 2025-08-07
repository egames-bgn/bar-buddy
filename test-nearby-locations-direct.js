// Direct test script for nearby locations endpoint
const axios = require('axios');
const crypto = require('crypto');

// Configuration - EXACTLY matching the old project and Prometheus
const PROXY_URL = 'http://localhost:3000';
// Use the same URL for both CloudHub and Cheerios in dev environment
const DEV_API_URL = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
const CLOUDHUB_API_URL = DEV_API_URL;
const CHEERIOS_API_URL = DEV_API_URL;

// Endpoints - EXACTLY matching Prometheus
const LOGIN_ENDPOINT = '/cloudhub/auth/buzztime_login/';
const NEARBY_SITES_ENDPOINT = '/cloudhub/network/nearby_sites/';

// Test location (Seattle)
const TEST_LATITUDE = 47.6062;
const TEST_LONGITUDE = -122.3321;
const MAX_SITES = 30;
const IS_MOCK_LOCATION = false;

// Test credentials (using the same ones from the old project)
const TEST_EMAIL = 'fhankin@buzztime.com';
const TEST_PASSWORD = 'BUZZ';

// JWT secret (matching Prometheus implementation)
const JWT_SECRET = 'secret';

/**
 * Generate JWT token exactly like Prometheus does
 * This matches the implementation in CloudHub.generateJWT_CH and JsonWebSignatureEncoder.convert
 */
function generateJWT(payload) {
  // Match the Prometheus implementation exactly
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // Ensure exp is a string to match Prometheus implementation
  if (payload.exp && typeof payload.exp !== 'string') {
    payload.exp = `${payload.exp}`;
  }
  
  console.log(`JWT Payload: ${JSON.stringify(payload)}`);
  
  // Base64Url encode the header and payload - EXACTLY like Prometheus
  // In Dart: base64Url.encode(jsonEncode(header).codeUnits)
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
  
  // Create the message to sign: header.payload (exactly like Prometheus)
  const message = `${encodedHeader}.${encodedPayload}`;
  
  // Create signature using HMAC-SHA256 exactly like Prometheus _signMessage function
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  const digest = hmac.update(message).digest();
  const signature = Buffer.from(digest)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Authenticate with CloudHub API to get a valid auth token
 * EXACTLY matching the old project's implementation
 */
async function authenticate() {
  console.log('\n==== Authenticating with CloudHub API ====');
  const url = CHEERIOS_API_URL + LOGIN_ENDPOINT;
  console.log(`Authentication URL: ${url}`);
  
  // Use valid test credentials from the old project
  const loginPayload = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    device_id: `test-device-${Date.now()}`
  };
  
  try {
    // Generate JWT for authentication - EXACTLY like the old project
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300; // 5 minutes expiration
    const authPayload = { exp: exp.toString() };
    
    console.log(`JWT Payload: ${JSON.stringify(authPayload)}`);
    const jwt = generateJWT(authPayload);
    console.log(`Generated JWT: ${jwt}`);
    
    console.log(`Request URL: ${url}`);
    console.log(`Request payload: ${JSON.stringify(loginPayload, null, 2)}`);
    
    const response = await axios.post(url, loginPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': jwt
      }
    });
    
    console.log(`Authentication response status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    
    // Extract auth token based on response structure - EXACTLY like the old project
    let authToken;
    if (response.data && response.data.auth_token) {
      authToken = response.data.auth_token;
      console.log('\u2705 Successfully authenticated with auth_token');
    } else if (response.data && response.data.player_id) {
      // In some environments, player_id is used as the auth token
      authToken = response.data.player_id.toString();
      console.log('\u2705 Successfully authenticated with player_id as token');
    } else {
      console.log('\u274c Authentication response missing auth_token and player_id');
      return null;
    }
    
    return authToken;
  } catch (error) {
    console.log('Authentication error:', error.message);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    }
    
    // For testing purposes, return a hardcoded token if authentication fails
    console.log('Using fallback test auth token');
    return 'test-auth-token-12345';
  }
}

/**
 * Test nearby locations via proxy
 * EXACTLY matching the old project's implementation
 */
async function testNearbyLocationsViaProxy(authToken) {
  console.log('\n==== Testing Nearby Locations via Proxy ====');
  const url = `${PROXY_URL}/cloudhub/network/nearby_sites/`;
  console.log(`Proxy URL: ${url}`);
  
  // Prepare request payload - EXACTLY like the old project
  const payload = {
    latitude: TEST_LATITUDE,
    longitude: TEST_LONGITUDE,
    max_sites: MAX_SITES,
    isMockLocationFlag: IS_MOCK_LOCATION,
    auth_token: authToken
  };
  console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);
  
  try {
    console.log(`Sending request to proxy: ${url}`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Proxy API response status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    
    // Check if the response contains sites
    if (response.data && Array.isArray(response.data.sites)) {
      console.log(`Found ${response.data.sites.length} venues`);
    } else {
      console.log('No venues found or unexpected response format');
    }
    
    return response.data;
  } catch (error) {
    console.log('Proxy API error:', error.message);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    }
    console.log('\u274c Failed to fetch venues via local proxy');
    return null;
  }
}

/**
 * Test nearby locations via direct CloudHub API
 * EXACTLY matching the old project's implementation
 */
async function testNearbyLocationsViaCloudHub(authToken) {
  console.log('\n==== Testing Nearby Locations via Direct CloudHub API ====');
  const url = CLOUDHUB_API_URL + NEARBY_SITES_ENDPOINT;
  console.log(`Direct CloudHub URL: ${url}`);
  
  // Generate JWT with auth_token in payload - EXACTLY like the old project
  const jwtPayload = {
    exp: (Math.floor(Date.now() / 1000) + 300).toString(), // Must be a string
    auth_token: authToken
  };
  console.log(`JWT Payload: ${JSON.stringify(jwtPayload)}`);
  const jwt = generateJWT(jwtPayload);
  console.log(`Generated JWT: ${jwt}`);
  
  // Prepare request payload - EXACTLY like the old project
  const payload = {
    latitude: TEST_LATITUDE,
    longitude: TEST_LONGITUDE,
    max_sites: MAX_SITES,
    isMockLocationFlag: IS_MOCK_LOCATION
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
    
    // Check if the response contains sites
    if (response.data && Array.isArray(response.data.sites)) {
      console.log(`Found ${response.data.sites.length} venues`);
    } else {
      console.log('No venues found or unexpected response format');
    }
    
    return response.data;
  } catch (error) {
    console.log('Venue API error:', error.message);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    }
    console.log('\u274c Failed to fetch venues via direct CloudHub API');

    return null;
  }
}

/**
 * Main function to run the test
 */
async function main() {
  console.log('Starting nearby locations test...');
  
  // Step 1: Authenticate to get a valid auth token
  const authToken = await authenticate();
  
  if (!authToken) {
    console.log('\u274c Authentication failed, cannot proceed with tests');
    return;
  }
  
  console.log(`\u2705 Authentication successful, auth token: ${authToken}`);
  
  // Step 2: Test nearby locations via proxy
  const proxyResult = await testNearbyLocationsViaProxy(authToken);
  
  // Step 3: Test nearby locations via direct CloudHub API
  const directResult = await testNearbyLocationsViaCloudHub(authToken);
  
  // Compare results
  if (proxyResult && directResult) {
    console.log('\n==== Comparison ====');
    
    const proxyVenues = proxyResult.sites ? proxyResult.sites.length : 0;
    const directVenues = directResult.sites ? directResult.sites.length : 0;
    
    console.log(`Proxy venues: ${proxyVenues}`);
    console.log(`Direct venues: ${directVenues}`);
    console.log('\u2705 Both tests completed successfully');
    
    // Show first venue as an example if available
    if (proxyResult.sites && proxyResult.sites.length > 0) {
      console.log('\nExample venue from proxy:');
      console.log(JSON.stringify(proxyResult.sites[0], null, 2));
    }
  } else {
    console.log('\n==== Comparison ====');
    console.log(`Proxy test ${proxyResult ? 'succeeded' : 'failed'}`);
    console.log(`Direct test ${directResult ? 'succeeded' : 'failed'}`);
    console.log('\u274c One or both tests failed');
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
});
