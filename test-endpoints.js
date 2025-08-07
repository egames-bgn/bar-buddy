/**
 * API Endpoint Test Script
 * 
 * Tests the API endpoints used in the diagnostics screen
 */

const axios = require('axios');

// API URLs from the diagnostics configuration
const CHEERIOS_API_URL = 'https://ntnservices.dev.buzztime.com';
const CLOUDHUB_API_URL = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';

// Test endpoints
const CHEERIOS_TEST_ENDPOINT = '/barbuddies/test/';
const CLOUDHUB_TEST_ENDPOINT = '/cloudhub/network/nearby_sites/';

// Test data for CloudHub API
const CLOUDHUB_TEST_DATA = {
  latitude: 32.7157,  // San Diego coordinates
  longitude: -117.1611,
  radius: 25,
  limit: 1
};

async function testCheeriosApi() {
  console.log(`\nTesting Cheerios API: ${CHEERIOS_API_URL}${CHEERIOS_TEST_ENDPOINT}`);
  try {
    const response = await axios.get(`${CHEERIOS_API_URL}${CHEERIOS_TEST_ENDPOINT}`, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Cheerios API test successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Cheerios API test failed!');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      } else if (error.request) {
        console.log('No response received (timeout or network error)');
      } else {
        console.log('Error:', error.message);
      }
    } else {
      console.log('Error:', error);
    }
    return false;
  }
}

async function testCloudHubApi() {
  console.log(`\nTesting CloudHub API: ${CLOUDHUB_API_URL}${CLOUDHUB_TEST_ENDPOINT}`);
  try {
    const response = await axios.post(`${CLOUDHUB_API_URL}${CLOUDHUB_TEST_ENDPOINT}`, CLOUDHUB_TEST_DATA, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ CloudHub API test successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data).substring(0, 200) + '...');
    return true;
  } catch (error) {
    console.log('❌ CloudHub API test failed!');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      } else if (error.request) {
        console.log('No response received (timeout or network error)');
      } else {
        console.log('Error:', error.message);
      }
    } else {
      console.log('Error:', error);
    }
    return false;
  }
}

// Try with GET method too for CloudHub
async function testCloudHubApiGet() {
  console.log(`\nTesting CloudHub API with GET: ${CLOUDHUB_API_URL}${CLOUDHUB_TEST_ENDPOINT}`);
  try {
    const response = await axios.get(`${CLOUDHUB_API_URL}${CLOUDHUB_TEST_ENDPOINT}`, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ CloudHub API GET test successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data).substring(0, 200) + '...');
    return true;
  } catch (error) {
    console.log('❌ CloudHub API GET test failed!');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      } else if (error.request) {
        console.log('No response received (timeout or network error)');
      } else {
        console.log('Error:', error.message);
      }
    } else {
      console.log('Error:', error);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Starting API endpoint tests...');
  
  const cheeriosResult = await testCheeriosApi();
  const cloudHubResult = await testCloudHubApi();
  const cloudHubGetResult = await testCloudHubApiGet();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`Cheerios API: ${cheeriosResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CloudHub API (POST): ${cloudHubResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CloudHub API (GET): ${cloudHubGetResult ? '✅ PASS' : '❌ FAIL'}`);
  
  // Try alternative endpoints for CloudHub if both tests failed
  if (!cloudHubResult && !cloudHubGetResult) {
    console.log('\n🔄 Trying alternative CloudHub endpoints...');
    
    // Try the root endpoint
    try {
      console.log(`Testing CloudHub root: ${CLOUDHUB_API_URL}/`);
      const response = await axios.get(`${CLOUDHUB_API_URL}/`, {
        timeout: 5000
      });
      console.log('✅ CloudHub root endpoint accessible!');
      console.log('Status:', response.status);
    } catch (error) {
      console.log('❌ CloudHub root endpoint not accessible');
      if (axios.isAxiosError(error) && error.response) {
        console.log('Status:', error.response.status);
      }
    }
  }
}

runTests().catch(console.error);
