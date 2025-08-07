const axios = require('axios');

// Constants for CloudHub authentication
// Import shared JWT utilities
const { 
  generateJWT, 
  addCloudHubAuthHeaders, 
  CLOUDHUB_PLATFORM_API_KEY, 
  JWT_SECRET 
} = require('./modules/auth/utils/shared-jwt');

// Using the shared addCloudHubAuthHeaders function from shared-jwt.js

// Test endpoints the same way the diagnostics screen would
async function testEndpoints() {
  console.log('🔍 Testing API endpoints as the diagnostics screen would...\n');
  
  // Test Cheerios API
  await testCheeriosApi();
  
  // Test CloudHub API with authentication
  await testCloudHubApi();
  
  // Test Proxy API
  await testProxyApi();
}

async function testCheeriosApi() {
  try {
    console.log('Testing Cheerios API...');
    const url = 'https://ntnservices.dev.buzztime.com';
    const endpoint = '/barbuddies/test/';
    
    console.log(`URL: ${url}${endpoint}`);
    const response = await axios.get(`${url}${endpoint}`, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ Cheerios API test successful!`);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data)}\n`);
    return true;
  } catch (error) {
    console.log(`❌ Cheerios API test failed!`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
    } else if (error.request) {
      console.log('No response received (timeout or network error)\n');
    } else {
      console.log(`Error: ${error.message}\n`);
    }
    return false;
  }
}

async function testCloudHubApi() {
  try {
    // Test direct CloudHub API first with our JWT utility
    console.log('Testing direct CloudHub API authentication with JWT...');
    const directUrl = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
    const endpoint = '/cloudhub/auth/buzztime_login/';
    const data = {
      email: 'fhankin@buzztime.com',
      password: 'BUZZ',
      device_id: 'test-diagnostics',
      invite_token: ''
    };
    
    console.log(`Direct URL: ${directUrl}${endpoint}`);
    console.log(`Using credentials: ${data.email} / ********`);
    
    try {
      // Basic headers
      let headers = { 
        'Content-Type': 'application/json',
        'x-client-type': 'mobile-client'
      };
      
      // Add JWT and platform API key headers using our utility
      headers = await addCloudHubAuthHeaders(headers);
      console.log('Headers:', JSON.stringify(headers, null, 2));
      
      const directResponse = await axios.post(`${directUrl}${endpoint}`, data, {
        timeout: 5000,
        headers: headers
      });
      
      console.log(`✅ Direct CloudHub API authentication successful!`);
      console.log(`Status: ${directResponse.status}`);
      console.log(`Response: ${JSON.stringify(directResponse.data)}\n`);
    } catch (directError) {
      console.log(`❌ Direct CloudHub API authentication failed!`);
      if (directError.response) {
        console.log(`Status: ${directError.response.status}`);
        console.log(`Response: ${JSON.stringify(directError.response.data)}\n`);
      } else if (directError.request) {
        console.log('No response received (timeout or network error)\n');
      } else {
        console.log(`Error: ${directError.message}\n`);
      }
    }
    
    // Now test through proxy which handles JWT and platform API key
    console.log('\nTesting CloudHub API authentication through proxy...');
    const proxyUrl = 'http://localhost:3000';
    
    console.log(`Proxy URL: ${proxyUrl}${endpoint}`);
    console.log(`Using credentials: ${data.email} / ********`);
    
    const response = await axios.post(`${proxyUrl}${endpoint}`, data, {
      timeout: 5000,
      headers: { 
        'Content-Type': 'application/json',
        'x-client-type': 'web-client'
      }
    });
    
    console.log(`✅ CloudHub API authentication successful!`);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data)}\n`);
    return true;
  } catch (error) {
    console.log(`❌ CloudHub API authentication failed!`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
    } else if (error.request) {
      console.log('No response received (timeout or network error)\n');
    } else {
      console.log(`Error: ${error.message}\n`);
    }
    return false;
  }
}

async function testProxyApi() {
  try {
    console.log('Testing Proxy API...');
    const url = 'http://localhost:3000';
    const endpoint = '/health';
    
    console.log(`URL: ${url}${endpoint}`);
    const response = await axios.get(`${url}${endpoint}`, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ Proxy API test successful!`);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data)}\n`);
    return true;
  } catch (error) {
    console.log(`❌ Proxy API test failed!`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
    } else if (error.request) {
      console.log('No response received (timeout or network error)\n');
    } else {
      console.log(`Error: ${error.message}\n`);
    }
    return false;
  }
}

// Start the API proxy server
async function startProxyServer() {
  console.log('Starting API proxy server...');
  const { spawn } = require('child_process');
  const proxyProcess = spawn('node', ['modules/api-proxy/services/proxyServer.js'], {
    stdio: 'inherit'
  });
  
  // Give the server a moment to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return proxyProcess;
}

// Run tests
async function run() {
  let proxyProcess = null;
  try {
    // Start the proxy server
    proxyProcess = await startProxyServer();
    
    // Wait a bit for the server to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run the tests
    await testEndpoints();
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Clean up
    if (proxyProcess) {
      console.log('Stopping proxy server...');
      proxyProcess.kill();
    }
  }
}

run();
