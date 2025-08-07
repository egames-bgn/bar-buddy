const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const { config, currentEnvironment } = require('../../config/environment');

// Get API base URLs from environment configuration
const CHEERIOS_API_URL = config.cheeriosApiUrl || 'https://ntnservices.dev.buzztime.com'; // Cheerios service
const CLOUDHUB_API_URL = "https://ch-api-dev-ooifid6utq-uc.a.run.app"; // CloudHubAPI
// Use the exact same secret as in the Prometheus project
const JWT_SECRET = "secret";

// Log current environment for debugging
console.log(`Proxy server running in ${currentEnvironment} environment`);
console.log(`Proxying Cheerios requests to: ${CHEERIOS_API_URL}`);
console.log(`Proxying CloudHub requests to: ${CLOUDHUB_API_URL}`);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to normalize header names (case-insensitive)
function getHeaderCaseInsensitive(headers, headerName) {
  const headerKeys = Object.keys(headers);
  const key = headerKeys.find(k => k.toLowerCase() === headerName.toLowerCase());
  return key ? headers[key] : undefined;
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Generate JWT token for authentication
 * Similar to the Flutter implementation but done server-side for web clients
 */
function generateJWT(endpointOrPayload, method) {
  // Check if first argument is a payload object or an endpoint string
  let payload;
  if (typeof endpointOrPayload === 'object') {
    payload = endpointOrPayload;
    console.log(`[PROXY SERVER] Generating JWT with custom payload`);
  } else {
    console.log(`[PROXY SERVER] Generating JWT for ${method} ${endpointOrPayload}`);
    
    // Create default payload
    const nowUtc = new Date().getTime();
    const secondsToExpire = Math.round(nowUtc / 1000) + 300; // 5 minutes expiration
    
    payload = {
      exp: `${secondsToExpire}`, // Must be a string to match Prometheus implementation
      auth_token: 'dev-auth-token' // Add auth_token as seen in Prometheus implementation
    };
  }
  
  // Match the Prometheus implementation exactly
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // Base64Url encode the header and payload
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
  
  // Create the message to sign: header.payload
  const message = `${encodedHeader}.${encodedPayload}`;
  
  // Create signature using HMAC-SHA256 exactly like Prometheus
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  const digest = hmac.update(message).digest();
  const signature = Buffer.from(digest)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Create a request logger
function logRequest(req) {
  const timestamp = new Date().toISOString();
  console.log(`\n[PROXY SERVER] ${timestamp} - ${req.method} ${req.path}`);
  console.log(`[PROXY SERVER] Client IP: ${req.ip}`);
  console.log(`[PROXY SERVER] Headers:`, req.headers);
  
  if (req.body && Object.keys(req.body).length > 0) {
    // Log request body but mask sensitive data
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '********';
    console.log(`[PROXY SERVER] Request body:`, sanitizedBody);
  }
}

// JWT endpoint
app.post('/api/jwt', (req, res) => {
  const { endpoint, method } = req.body;
  
  if (!endpoint || !method) {
    return res.status(400).json({ error: 'Endpoint and method are required' });
  }
  
  try {
    const jwt = generateJWT(endpoint, method);
    res.json({ jwt });
  } catch (error) {
    console.error('[PROXY SERVER] JWT generation error:', error);
    res.status(500).json({ error: 'Failed to generate JWT' });
  }
});

// POST endpoint for nearby locations
app.post('/cloudhub/network/nearby_sites/', async (req, res) => {
  console.log('\n==== Nearby Locations Request ====');
  console.log(`Request body: ${JSON.stringify(req.body)}`);
  
  // Extract parameters from request body
  const { latitude, longitude, max_sites = 30, isMockLocationFlag = false } = req.body;
  
  // Validate required parameters
  if (!latitude || !longitude) {
    console.log('Missing required parameters: latitude and longitude');
    return res.status(400).json({ error: 'Missing required parameters: latitude and longitude' });
  }
  
  try {
    // Get auth token from request headers using case-insensitive helper
    const authToken = getHeaderCaseInsensitive(req.headers, 'auth-token');
    
    console.log('Headers received:', JSON.stringify(req.headers));
    console.log('Auth token found:', authToken ? 'Yes' : 'No');
    
    // Use the auth token from headers if available, otherwise use a default token
    // This allows web clients to access this endpoint with their actual auth token
    const effectiveToken = authToken || 'dev-auth-token';
    
    // Create the request payload with the correct parameter names (lowercase)
    // This matches exactly what the mobile app sends to avoid any parameter name conflicts
    const payload = {
      latitude,
      longitude,
      max_sites,
      isMockLocationFlag
    };
    
    // Generate JWT with auth token in payload
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300; // 5 minutes expiration
    const jwtPayload = { 
      exp: exp.toString(),
      auth_token: effectiveToken
    };
    
    const jwt = generateJWT(jwtPayload);
    console.log(`Request payload: ${JSON.stringify(payload)}`);
    
    // Make request to CloudHub API
    console.log('Sending request to CloudHub API...');
    console.log(`Using JWT: ${jwt}`);
    
    const url = `${CLOUDHUB_API_URL}/cloudhub/network/nearby_sites/`;
    console.log(`Target URL: ${url}`);
    
    // Log the final request details before sending to CloudHub
    console.log(`[PROXY SERVER] Final request URL: ${url}`);
    console.log(`[PROXY SERVER] Final request payload: ${JSON.stringify(payload, null, 2)}`);
    
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': jwt,
        'X-Platform-API-Key': '5BAA7F6E-C84B-4197-9F90-64019BC85028'
      }
    });
    
    console.log(`CloudHub API response status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    // Return the response from CloudHub API
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error calling CloudHub API:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data));
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle GET requests to nearby locations endpoint
app.get('/cloudhub/network/nearby_sites/', (req, res) => {
  console.log('GET request received for nearby locations endpoint');
  res.status(405).json({ error: 'Method not allowed. Use POST instead.' });
});

// Health check endpoint for diagnostics
app.get('/health', (req, res) => {
  console.log('[PROXY SERVER] Health check request received');
  res.status(200).json({ 
    status: 'ok', 
    message: 'Proxy server is running', 
    cheeriosApiUrl: CHEERIOS_API_URL,
    cloudHubApiUrl: CLOUDHUB_API_URL
  });
});

// Main proxy handler - use a middleware approach instead of app.all('*')
app.use((req, res, next) => {
  // Skip static files and favicon
  if (req.path === '/favicon.ico') {
    return res.status(404).send('Not found');
  }

  // Log incoming request
  logRequest(req);

  // Keep the original path and query string
  const targetPath = req.path;
  let queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  
  // Transform user_id parameter to UserID for all API requests
  if (queryString.includes('user_id=')) {
    queryString = queryString.replace('user_id=', 'UserID=');
    console.log(`[PROXY SERVER] Transformed query parameters: ${queryString}`);
  }
  
  // Determine which API service to use based on the path
  let baseUrl;
  
  // Route all /cloudhub/ requests to CloudHub API
  if (targetPath.startsWith('/cloudhub/')) {
    baseUrl = CLOUDHUB_API_URL;
    console.log(`[PROXY SERVER] Using CloudHub API for path: ${targetPath}`);
  } 
  // Route all other requests to Cheerios API
  else {
    baseUrl = CHEERIOS_API_URL;
    console.log(`[PROXY SERVER] Using Cheerios API for path: ${targetPath}`);
  }
  
  const targetUrl = `${baseUrl}${targetPath}${queryString}`;
  console.log(`[PROXY SERVER] Forwarding request to: ${targetUrl}`);
  
  // Check if this is a web client request that needs JWT
  const clientType = req.headers['x-client-type'];
  let headers = {
    // Remove host-specific headers to avoid CORS issues
    ...req.headers,
    host: undefined,
    origin: undefined,
    referer: undefined,
  };
  
  // Get auth token from request headers using case-insensitive helper
  const authToken = getHeaderCaseInsensitive(req.headers, 'auth-token');
  
  // For CloudHub API requests, we need to add JWT and platform API key
  if (baseUrl === CLOUDHUB_API_URL) {
    console.log(`[PROXY SERVER] Preparing CloudHub API request for ${req.method} ${targetPath}`);
    try {
      // Create JWT payload with auth token if available
      let jwtPayload;
      if (authToken) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 300; // 5 minutes expiration
        jwtPayload = { 
          exp: exp.toString(),
          auth_token: authToken
        };
        console.log('[PROXY SERVER] Using auth token in JWT payload');
      } else {
        console.log('[PROXY SERVER] No auth token available, using default JWT payload');
      }
      
      // Generate JWT with auth token in payload if available
      const jwt = authToken ? generateJWT(jwtPayload) : generateJWT(targetPath, req.method);
      
      // Use JWT directly as Authorization header value without Bearer prefix
      headers['Authorization'] = jwt;
      // Add platform API key for CloudHub API
      headers['X-Platform-API-Key'] = '5BAA7F6E-C84B-4197-9F90-64019BC85028';
      console.log('[PROXY SERVER] Added JWT token and platform API key to request headers');
    } catch (error) {
      console.error('[PROXY SERVER] JWT generation failed:', error.message);
    }
  } else {
    console.log('[PROXY SERVER] Using standard headers for Cheerios API');
  }
  
  console.log(`[PROXY SERVER] Sending request to API server...`);
  
  // Special handling for nearby_sites endpoint
  let requestData = req.body;

  // Check if this is the nearby_sites endpoint
  if (targetPath === '/cloudhub/network/nearby_sites/') {
    console.log(`[PROXY SERVER] Special handling for nearby_sites endpoint`);
    console.log(`[PROXY SERVER] Original request body:`, requestData);
    
    // Ensure the request body has the correct parameters with lowercase names
    // This matches the direct API call from the mobile app exactly
    requestData = {
      latitude: requestData.latitude || 33.1581, // Default to Carlsbad, CA if not provided
      longitude: requestData.longitude || -117.3506,
      max_sites: requestData.max_sites || 30,
      isMockLocationFlag: requestData.isMockLocationFlag || false
    };
    
    console.log(`[PROXY SERVER] Transformed request body for nearby_sites:`, requestData);
    
    // Log the final request details before sending to CloudHub
    console.log(`[PROXY SERVER] Final request URL: ${targetUrl}`);
    console.log(`[PROXY SERVER] Final request headers: ${JSON.stringify(headers, null, 2)}`);
    console.log(`[PROXY SERVER] Final request data: ${JSON.stringify(requestData, null, 2)}`);
    
    // Skip the dedicated endpoint handler since we're handling it here
    // This prevents parameter name conflicts between the two handlers
    return axios({
      method: req.method,
      url: targetUrl,
      data: requestData,
      headers: headers,
    })
      .then(response => {
        console.log(`[PROXY SERVER] API response received - Status: ${response.status}`);
        console.log(`[PROXY SERVER] Response data:`, response.data);
        res.status(response.status).json(response.data);
      })
      .catch(error => {
        console.error(`[PROXY SERVER] Request to API server failed:`, error.message);
        if (error.response) {
          console.error(`[PROXY SERVER] Error status: ${error.response.status}`);
          console.error(`[PROXY SERVER] Error data:`, error.response.data);
          res.status(error.response.status).json(error.response.data);
        } else {
          console.error(`[PROXY SERVER] No response from API server`);
          res.status(500).json({ error: 'Proxy server error' });
        }
      });
  }

  // Forward the request to the actual API
  axios({
    method: req.method,
    url: targetUrl,
    data: requestData,
    headers: headers,
  })
    .then(response => {
      // Log successful response
      console.log(`[PROXY SERVER] API response received - Status: ${response.status}`);
      console.log(`[PROXY SERVER] Response headers:`, response.headers);
      
      // Log response data but sanitize sensitive information
      const sanitizedData = { ...response.data };
      if (sanitizedData.token) sanitizedData.token = '********';
      console.log(`[PROXY SERVER] Response data:`, sanitizedData);
      
      // Send the API response back to the client
      console.log(`[PROXY SERVER] Forwarding response to client`);
      res.status(response.status).json(response.data);
    })
    .catch(error => {
      console.error(`[PROXY SERVER] Request to API server failed:`, error.message);
      
      // Forward error response if available
      if (error.response) {
        console.error(`[PROXY SERVER] Error status: ${error.response.status}`);
        console.error(`[PROXY SERVER] Error data:`, error.response.data);
        res.status(error.response.status).json(error.response.data);
      } else {
        console.error(`[PROXY SERVER] No response from API server`);
        res.status(500).json({ error: 'Proxy server error' });
      }
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Proxy server running on port ${PORT}`);
});

module.exports = app;
