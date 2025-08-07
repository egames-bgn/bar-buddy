// Simple test script to verify the login flow through the API proxy service
const axios = require('axios');

async function testLogin() {
  console.log('Testing login flow through API proxy service...');
  
  try {
    // Test login with real credentials
    const response = await axios.post('http://localhost:3000/cloudhub/auth/buzztime_login/', {
      email: 'fhankin@buzztime.com',
      password: 'BUZZ',
      device_id: 'web-client-test',
      invite_token: ''
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-client-type': 'web-client'
      }
    });
    
    console.log('Login successful!');
    console.log('Response status:', response.status);
    console.log('Player ID:', response.data.player_id);
    console.log('Display Name:', response.data.display_name);
    console.log('Session ID:', response.data.session_id);
    console.log('Auth Token received:', !!response.data.auth_token);
    
    // Test a subsequent authenticated request using the auth token
    if (response.data.auth_token) {
      console.log('\nTesting authenticated request with the received auth token...');
      try {
        // Example of an authenticated request (this path may need to be adjusted)
        const authResponse = await axios.get('http://localhost:3000/cloudhub/player/get_profile/', {
          headers: {
            'Content-Type': 'application/json',
            'x-client-type': 'web-client',
            'Authorization': response.data.auth_token
          }
        });
        
        console.log('Authenticated request successful!');
        console.log('Response status:', authResponse.status);
        console.log('Response data:', authResponse.data);
      } catch (authError) {
        console.error('Authenticated request failed:', authError.response ? authError.response.data : authError.message);
      }
    }
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    console.error('Status code:', error.response ? error.response.status : 'Unknown');
  }
}

testLogin();
