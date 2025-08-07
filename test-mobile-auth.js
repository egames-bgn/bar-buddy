/**
 * Test script to verify mobile authentication with CloudHub API
 * 
 */
const axios = require('axios');

// Import shared JWT utilities
const { 
  generateJWT, 
  addCloudHubAuthHeaders, 
  CLOUDHUB_PLATFORM_API_KEY, 
  JWT_SECRET 
} = require('./modules/auth/utils/shared-jwt');

// Constants for CloudHub API
const CLOUDHUB_API_URL = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';

/**
 * Test CloudHub API authentication with JWT
 */
async function testCloudHubAuth() {
  try {
    console.log('Testing CloudHub API authentication with JWT...');
    const endpoint = '/cloudhub/auth/buzztime_login/';
    const url = `${CLOUDHUB_API_URL}${endpoint}`;
    
    const data = {
      email: 'fhankin@buzztime.com',
      password: 'BUZZ',
      device_id: 'mobile-test',
      invite_token: ''
    };
    
    // Basic headers
    let headers = { 
      'Content-Type': 'application/json',
      'x-client-type': 'mobile-client'
    };
    
    // Add JWT and platform API key headers
    headers = await addCloudHubAuthHeaders(headers);
    
    console.log(`URL: ${url}`);
    console.log(`Using credentials: ${data.email} / ********`);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    
    // Make the request
    const response = await axios.post(url, data, {
      timeout: 5000,
      headers: headers
    });
    
    console.log(`✅ CloudHub API authentication successful!`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`❌ CloudHub API authentication failed!`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received (timeout or network error)');
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

// Run the test
(async () => {
  console.log('🔍 Testing mobile authentication with CloudHub API...');
  
  try {
    const result = await testCloudHubAuth();
    console.log('✅ Test completed successfully!');
    
    // If we got an auth token, we could store it for future requests
    if (result && result.auth_token) {
      console.log(`Received auth token: ${result.auth_token.substring(0, 8)}...`);
    }
  } catch (error) {
    console.error('❌ Test failed!');
  }
})();
