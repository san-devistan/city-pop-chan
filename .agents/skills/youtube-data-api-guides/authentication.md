# Implementing OAuth 2.0 Authorization Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- The YouTube Data API uses the OAuth 2.0 protocol to authorize access to private user data, which is initiated when a user attempts to use features requiring login.
- During authorization, the application requests specific scopes of access, defining which resources it can manage on behalf of the user.
- Upon user consent, Google issues a token to the application, which may be exchanged for an access token and a refresh token, allowing the application to act on the user's behalf.
- Google APIs support various OAuth 2.0 flows tailored to different application types, such as server-side web apps, JavaScript web apps, mobile and desktop apps, and limited-input devices.
- While OAuth 2.0 includes a service account flow, the YouTube Data API does not support this method, and using it will result in a NoLinkedYouTubeAccount error.
The YouTube Data API supports the OAuth 2.0 protocol for authorizing access to private user data. The following list explains some core OAuth 2.0 concepts:
- When a user first attempts to use features in your application that requires the user to be logged in to a Google Account or YouTube account , your application initiates the OAuth 2.0 authorization process.
- Your application directs the user to Google's authorization server. The link to that page specifies the scope of access that your application is requesting for the user's account. The scope specifies the resources that your application can retrieve, insert, update, or delete when acting as the authenticated user.
- If the user consents to authorize your application to access those resources, Google returns a token to your application. Depending on your application's type, it either validates the token or exchanges it for a different type of token. For example, a server-side web application exchanges the returned token for an access token and a refresh token. The access token lets the application authorize requests on the user's behalf, and the refresh token lets the application retrieve a new access token when the original access token expires.
Important: To use the OAuth 2.0 Authorization, you need to obtain authorization credentials in the Google API Console .
For more details, see the OAuth 2.0 Authorization Guide .
## OAuth 2.0 flows
Google APIs support several OAuth 2.0 use cases:
- The server-side web apps flow supports web applications that can securely store persistent information.
- The JavaScript web apps flow supports JavaScript applications running in a browser.
- The mobile and desktop apps flow supports applications installed on a device, such as a phone or computer.
- The TVs and limited-input devices flow supports devices with limited input capabilities, such as game consoles and video cameras. The OAuth 2.0 flow for service account flow supports server-to-server interactions that do not access user information. However, the YouTube Data API does not support this flow. Since there is no way to link a Service Account to a YouTube account, attempts to authorize requests with this flow will generate a NoLinkedYouTubeAccount error.