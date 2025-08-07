/**
 * Test script to verify JWT implementation in both Node.js and React Native environments
 */
const { 
  generateJWT, 
  addCloudHubAuthHeaders, 
  CLOUDHUB_PLATFORM_API_KEY, 
  JWT_SECRET 
} = require('./modules/auth/utils/shared-jwt');

// Constants for CloudHub API
const CLOUDHUB_API_URL = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
const axios = require('axios');

/**
 * Test JWT generation and CloudHub API authentication
 */
async function testJwtImplementation() {
  try {
    console.log('Testing JWT implementation...');
    
    // Generate JWT token
    const jwt = await generateJWT();
    console.log('Generated JWT:', jwt);
    
    // Parse JWT to verify structure
    const [header, payload, signature] = jwt.split('.');
    console.log('JWT parts:');
    console.log('- Header:', header);
    console.log('- Payload:', payload);
    console.log('- Signature:', signature);
    
    // Test CloudHub API authentication
    const endpoint = '/cloudhub/auth/buzztime_login/';
    const url = `${CLOUDHUB_API_URL}${endpoint}`;
    
    const data = {
      email: 'fhankin@buzztime.com',
      password: 'BUZZ',
      device_id: 'mobile-test',
      invite_token: ''
    };
    
    // Add JWT and platform API key headers
    const headers = await addCloudHubAuthHeaders({
      'Content-Type': 'application/json',
      'x-client-type': 'mobile-client'
    });
    
    console.log('Headers:', headers);
    
    // Make the request
    console.log(`Making request to ${url}...`);
    const response = await axios.post(url, data, {
      timeout: 5000,
      headers: headers
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    return {
      success: true,
      message: 'JWT implementation test successful',
      jwt,
      response: {
        status: response.status,
        data: response.data
      }
    };
  } catch (error) {
    console.error('Error testing JWT implementation:', error);
    
    let errorDetails = {
      message: error.message
    };
    
    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.data = error.response.data;
    }
    
    return {
      success: false,
      message: 'JWT implementation test failed',
      error: errorDetails
    };
  }
}

// Run the test
testJwtImplementation()
  .then(result => {
    console.log('Test result:', result);
    if (result.success) {
      console.log('✅ JWT implementation test passed');
    } else {
      console.log('❌ JWT implementation test failed');
    }
  })
  .catch(error => {
    console.error('Test execution error:', error);
  });
