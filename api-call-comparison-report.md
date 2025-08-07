# Comparison Report: Direct vs Proxy API Calls for Nearby Locations

## Overview
This report compares the API calls made directly from the Android app versus those routed through the proxy server for the nearby locations endpoint.

## Endpoint URLs
Both direct and proxy calls use the same endpoint:
- **Base URL**: `https://ch-api-dev-ooifid6utq-uc.a.run.app`
- **Path**: `/cloudhub/network/nearby_sites/`
- **Full URL**: `https://ch-api-dev-ooifid6utq-uc.a.run.app/cloudhub/network/nearby_sites/`

## HTTP Methods
- **Direct Call**: POST
- **Proxy Call**: POST

## Request Headers

### Direct Android Call
- `Content-Type: application/json`
- `Authorization: [JWT token]` (JWT without "Bearer" prefix)
- `X-Platform-API-Key: 5BAA7F6E-C84B-4197-9F90-64019BC85028`

### Proxy Server Call
- `Content-Type: application/json`
- `Authorization: [JWT token]` (JWT without "Bearer" prefix)
- `X-Platform-API-Key: 5BAA7F6E-C84B-4197-9F90-64019BC85028`
- Removes host-specific headers (host, origin, referer) to avoid CORS issues
- Adds `X-Client-Type: web-client` for identification

## Request Payloads

### Direct Android Call
```json
{
  "latitude": 33.1581,
  "longitude": -117.3506,
  "max_sites": 30,
  "isMockLocationFlag": false
}
```

### Proxy Server Call
```json
{
  "latitude": 33.1581,
  "longitude": -117.3506,
  "max_sites": 30,
  "isMockLocationFlag": false
}
```

## JWT Token Generation

### Direct Android Call
- Uses `shared-jwt.js` utility functions
- Token retrieved from AsyncStorage
- Has token refresh mechanism
- JWT payload includes:
  ```json
  {
    "exp": "[expiration timestamp]",
    "auth_token": "[actual auth token from storage]"
  }
  ```

### Proxy Server Call
- Generates JWT inline in `proxyServer.js`
- Can extract auth token from request headers or use default token
- Uses default token (`dev-auth-token`) if none provided
- JWT payload includes:
  ```json
  {
    "exp": "[expiration timestamp]",
    "auth_token": "[actual auth token or default]"
  }
  ```

## Authentication Token Handling

### Direct Android Call
- Token stored in AsyncStorage with key `auth_token`
- Has token validation and refresh logic
- Token appears to be time-sensitive and tied to recent login
- Token is retrieved and passed to JWT generation function

### Proxy Server Call
- Token can be provided in request headers
- Falls back to default token if none provided
- Does not have token refresh mechanism

## Response Handling
- Both approaches handle responses similarly
- Both parse JSON responses automatically through axios
- Error handling is consistent between both approaches

## Special Transformations

### Direct Android Call
- No special parameter transformations
- Uses exact parameter names as expected by CloudHub API

### Proxy Server Call
- Transforms query parameters (e.g., `user_id` to `UserID`)
- Applies default values for missing parameters:
  - latitude: defaults to 33.1581 (Carlsbad, CA)
  - longitude: defaults to -117.3506 (Carlsbad, CA)
  - max_sites: defaults to 30
  - isMockLocationFlag: defaults to false

## Key Differences Summary

1. **Header Management**:
   - Proxy removes host-specific headers to prevent CORS issues
   - Proxy adds client identification header

2. **Token Retrieval**:
   - Direct call retrieves token from AsyncStorage
   - Proxy can receive token in headers or use default

3. **Token Validation**:
   - Direct call has token validation and refresh logic
   - Proxy does not validate or refresh tokens

4. **Parameter Handling**:
   - Proxy applies default values for missing parameters
   - Proxy transforms certain query parameters for compatibility

5. **Error Handling**:
   - Both have similar response handling
   - Proxy has more detailed logging for debugging

## Browser Test Results
Browser tests using the proxy server resulted in a 481 error with "Invalid auth token" from the CloudHub API. This suggests that:
1. The auth token must be freshly issued or linked to a recent login
2. The default token used by the proxy may not be valid for CloudHub API
3. Stored tokens may expire and require refreshing

## Recommendations
1. For web clients using the proxy, ensure a valid auth token from a recent login is provided
2. Consider implementing token refresh logic in the proxy server
3. Verify that the default token used by the proxy is valid for CloudHub API
