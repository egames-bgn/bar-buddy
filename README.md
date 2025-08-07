# Bar Buddy Prototype

This is an [Expo](https://expo.dev) React Native mobile application with a modular architecture. The app includes authentication functionality and an API proxy to handle backend communication.

## Project Structure

The application follows a modular architecture with the following key components:

### Authentication Module

Located in `modules/auth/`, this module handles user authentication including:

- **Login**: User authentication with email and password
- **Registration**: New user sign-up with profile information
- **Forgot Password**: Password reset functionality

Key components:

- `types/authTypes.ts`: TypeScript interfaces for authentication data
- `services/authService.ts`: Core authentication service handling API calls and token management
- `hooks/useAuth.tsx`: React context provider for authentication state management
- `screens/`: UI components for login, registration, and password reset

### API Proxy Module

Located in `modules/api-proxy/`, this module handles API communication:

- **API Service**: Manages API calls with automatic token handling
- **JWT Generation**: Creates and validates JWT tokens
- **Proxy Server**: Express server to avoid CORS issues during web development

Key components:

- `services/apiProxyService.ts`: Core service for API communication
- `services/proxyServer.js`: Express server for proxying API requests

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure environment

   The app uses a single environment variable `REACT_APP_ENV` to switch between DEV and PRD environments.
   
   - When not set or set to `DEV`: Uses development API endpoints
   - When set to `PRD`: Uses production API endpoints
   
   You can configure environment-specific settings in:
   - `modules/config/environment.ts` (for TypeScript/React Native)
   - `modules/config/environment.js` (for Node.js/proxy server)

3. Start the proxy server (for web development)

   ```bash
   node modules/api-proxy/services/proxyServer.js
   ```

4. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

The app uses [file-based routing](https://docs.expo.dev/router/introduction) with routes defined in the **app** directory.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
