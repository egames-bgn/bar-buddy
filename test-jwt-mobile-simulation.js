/**
 * Test script to simulate mobile JWT authentication with CloudHub API
 * This simulates how the mobile app would authenticate directly with the CloudHub API
 */

const axios = require('axios');
const { 
  generateJWT, 
  addCloudHubAuthHeaders, 
  CLOUDHUB_PLATFORM_API_KEY, 
  JWT_SECRET 
} = require('./modules/auth/utils/shared-jwt');

// CloudHub API URL from memory
const CLOUDHUB_API_URL = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';

// Test endpoint and credentials
const TEST_ENDPOINT = '/cloudhub/auth/buzztime_login/';
const TEST_DATA = {
  email: 'fhankin@buzztime.com',
  password: 'BUZZ',
  device_id: 'jwt-test-script',
  invite_token: ''
};

/**
 * Test the CloudHub API authentication with our JWT implementation
 */
async function testCloudHubAuthentication() {
  console.log('🔍 Testing CloudHub API authentication with simulated mobile JWT...');
  
  try {
    // Create base headers
    let headers = {
      'Content-Type': 'application/json',
      'x-client-type': 'mobile-client'
    };
    
    // Generate JWT and add authentication headers
    console.log('Generating JWT token...');
    const jwt = await generateJWT();
    console.log(`Generated JWT: ${jwt}`);
    
    // Add authentication headers using the function with the updated signature
    headers = await addCloudHubAuthHeaders(headers, undefined, TEST_ENDPOINT, 'POST');
    
    console.log('Headers for CloudHub API request:');
    console.log(JSON.stringify(headers, null, 2));
    
    // Make the API request
    console.log(`Making request to: ${CLOUDHUB_API_URL}${TEST_ENDPOINT}`);
    const response = await axios.post(`${CLOUDHUB_API_URL}${TEST_ENDPOINT}`, TEST_DATA, {
      headers: headers,
      timeout: 5000
    });
    
    // Check the response
    console.log('✅ CloudHub API authentication successful!');
    console.log(`Status: ${response.status}`);
    console.log('Response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ CloudHub API authentication failed!');
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response data:');
        console.error(JSON.stringify(error.response.data, null, 2));
        console.error('Response headers:');
        console.error(JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('No response received (timeout or network error)');
        console.error(error.request);
      } else {
        console.error(`Error message: ${error.message}`);
      }
      console.error(`Request URL: ${error.config?.url}`);
      console.error(`Request headers: ${JSON.stringify(error.config?.headers, null, 2)}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

// Run the test
testCloudHubAuthentication()
  .then(success => {
    if (success) {
      console.log('✅ Test completed successfully!');
    } else {
      console.log('❌ Test failed!');
    }
  })
  .catch(err => {
    console.error('Unexpected error running test:', err);
  });
