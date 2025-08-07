// Test script to check authentication flow
const fetch = require('node-fetch');

// Configuration
const API_PROXY_URL = 'http://localhost:3000';
const EMAIL = 'test@example.com';
const PASSWORD = 'password123';
const DEVICE_ID = '12345-test-device';

async function testAuthFlow() {
  console.log('Testing complete authentication flow...');
  
  try {
    // Step 1: Login
    console.log('\n1. Attempting login...');
    const loginResponse = await fetch(`${API_PROXY_URL}/cloudhub/auth/buzztime_login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        device_id: DEVICE_ID,
        invite_token: ''
      }),
    });

    const loginData = await loginResponse.json();
    console.log(`Login response status: ${loginResponse.status}`);
    
    if (!loginData.auth_token) {
      console.error('Login failed - no auth token received');
      console.log('Response data:', loginData);
      return;
    }
    
    const authToken = loginData.auth_token;
    console.log('Auth token received:', authToken.substring(0, 10) + '...');
    console.log('Player ID:', loginData.player_id);
    
    // Step 2: Check token storage
    console.log('\n2. Testing token storage...');
    const tokenCheckResponse = await fetch(`${API_PROXY_URL}/test-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    if (tokenCheckResponse.ok) {
      const tokenCheckData = await tokenCheckResponse.json();
      console.log('Token check successful:', tokenCheckData);
    } else {
      console.log('Token check endpoint not available, skipping...');
    }
    
    // Step 3: Get user profile
    console.log('\n3. Getting user profile with token...');
    const profileResponse = await fetch(`${API_PROXY_URL}/cloudhub/player/profile/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const profileData = await profileResponse.json();
    console.log(`Profile response status: ${profileResponse.status}`);
    console.log('Profile data received:', !!profileData);
    
    if (profileData && profileData.display_name) {
      console.log('User display name:', profileData.display_name);
    } else {
      console.error('Failed to get profile data');
      console.log('Response data:', profileData);
    }
    
    // Step 4: Test logout
    console.log('\n4. Testing logout...');
    const logoutResponse = await fetch(`${API_PROXY_URL}/cloudhub/auth/logout/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    console.log(`Logout response status: ${logoutResponse.status}`);
    
    // Step 5: Verify token is invalidated
    console.log('\n5. Verifying token is invalidated...');
    const verifyResponse = await fetch(`${API_PROXY_URL}/cloudhub/player/profile/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    console.log(`Verify response status: ${verifyResponse.status}`);
    if (verifyResponse.status === 401) {
      console.log('Token successfully invalidated');
    } else {
      console.warn('Token may still be valid after logout');
    }
    
    console.log('\nAuth flow test completed');
    
  } catch (error) {
    console.error('Error during auth flow test:', error);
  }
}

testAuthFlow();
