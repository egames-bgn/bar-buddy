I want you to remember these directives while we work. Store them in a way that you will force you to look at them when making decisions while we work. 

This is a mobile app, but we are building and testing on web browsers. Some of the API interactions cause CORS errors. To fix this we have a proxy server to do the API COM. The App uses this proxy for logging in, buddy interactions, and as we continue to work the proxy will do more of this. The proxy and the app should not be using fake data, and should not fall back to fake data. When API calls fail, the app should allert me of the failure, and should not try to hide it or get around it with default values or fake data. When something was working but starts failing, either I or the AI changed something and broke it. We need to know that imeediatly and not days later when all hope of fixing it is gone. DO NOT USE FAKE DATA OR HIDE MISTAKES! 

Once we are no longer testing in the browser, the proxy server will not need to be running for our tests. It is only to help test in a browser. If we are testing on mobile or an emulator and the CORS errors are less likely to occur then we can run without starting the proxy server. In that case though, the app must use the endpoints directly. There are 2 web services we use, and they are Cheerios and CloudHubAPI. You must not break one while trying to fix the other. They are not the same, so when you try to fix a problem with an endpoint, ensure you do not change which service it is trying to use for that endpoint. Keep them straight. 

Also, I do not want processes started and then left running while more processes are started. Keep track of what ports you are using, and where you start processes. Ensure that you stop those processes before starting any new ones. 

===== USAGE COMMANDS =====

1. DAILY USAGE COMMANDS:
   start-proxy-server.bat
   - Starts the API proxy server
   - Replaces: node modules/api-proxy/services/proxyServer.js

   start-bar-buddy-web.bat
   - Runs the web app
   - Replaces: npm run web

   start-hot-reload.bat
   - Runs the web app with hot reloading enabled (auto-updates on code change)
   - Use this during active development instead of start-bar-buddy-web.bat

The project we are working on is bar-buddy
Project location: c:\GitHub\bar-buddy
Cheerios is the name of one web service we use and it can be accessed at https://ntnservices.dev.buzztime.com/
CloudHubAPI is another service we use, and can be accessed at https://ch-api-dev-ooifid6utq-uc.a.run.app

You consistantly forget to stop what you have running before starting something new, usually when you try to run on port 8082 I know you have forgotten that you have something you forgot on 8081. You try to leave things running on a port while you open it again on a new port. I want you to remember these directives while we work, so you do not waste my resources, and do not make me believe things are working when you have broken something. Please follow these instructions while we work and do not revert back to habbits that cause problems for me.
Adding comment for new git checkin. 
