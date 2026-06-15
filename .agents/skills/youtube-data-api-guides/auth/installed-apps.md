# OAuth 2.0 for Mobile & Desktop Apps Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- OAuth 2.0 allows installed applications to securely access the YouTube Data API without requiring users to share their login credentials, using a system browser and a local redirect URI for authorization.
- Applications must be registered and configured with the Google API Console, enabling the necessary APIs and creating authorization credentials specific to the platform (Android, iOS, or UWP) of the application.
- Access to user data is controlled through scopes, which limit what resources an application can access and require verification for public apps utilizing scopes that access sensitive user information.
- The process involves using PKCE for security, sending an authorization request to Google's OAuth 2.0 endpoint, obtaining an authorization code, exchanging it for access and refresh tokens, and then using the access token to make API calls.
- Applications should securely store refresh tokens for long-term access, handle errors like redirect_uri_mismatch , and be aware of methods to revoke tokens programmatically or through user settings.
This document explains how applications installed on devices like phones, tablets, and computers use Google's OAuth 2.0 endpoints to authorize access to the YouTube Data API.
OAuth 2.0 allows users to share specific data with an application while keeping their usernames, passwords, and other information private. For example, an application can use OAuth 2.0 to obtain permission to upload videos to a user's YouTube channel.
Installed apps are distributed to individual devices, and it is assumed that these apps cannot keep secrets. They can access Google APIs while the user is present at the app or when the app is running in the background.
This authorization flow is similar to the one used for web server applications . The main difference is that installed apps must open the system browser and supply a local redirect URI to handle responses from Google's authorization server.
## Libraries and samples
For iOS apps we recommend using the latest version of the Sign In With Google iOS SDK . The SDK handles user authorization and is simpler to implement than the lower-level protocol described in this guide.
For apps running on devices that don't support a system browser or that have limited input capabilities, such as TVs, game consoles, cameras, or printers, see OAuth 2.0 for TVs & Devices or Sign-In on TVs and Limited Input Devices .
## Prerequisites
### Enable APIs for your project
Any application that calls Google APIs needs to enable those APIs in the API Console.
To enable an API for your project:
1. Open the API Library in the Google API Console.
2. If prompted, select a project, or create a new one.
3. Use the Library page to find and enable the YouTube Data API. Find any other APIs that your application will use and enable those, too.
### Create authorization credentials
Any application that uses OAuth 2.0 to access Google APIs must have authorization credentials that identify the application to Google's OAuth 2.0 server. The following steps explain how to create credentials for your project. Your applications can then use the credentials to access APIs that you have enabled for that project.
1. Go to the Clients page .
2. Click Create client .
3. The following sections describe the client types that Google's authorization server supports. Choose the client type that is recommended for your application, name your OAuth client, and set the other fields in the form as appropriate.
##### iOS
1. Select the iOS application type.
2. Enter a name for the OAuth client. This name is displayed on your project's Clients page to identify the client.
3. Enter the bundle identifier for your app. The bundle ID is the value of the CFBundleIdentifier key in your app's information property list resource file ( info.plist ). The value is most commonly displayed in the General pane or the Signing & Capabilities pane of the Xcode project editor. The bundle ID is also displayed in the General Information section of the App Information page for the app on Apple's App Store Connect site . Confirm that you are using the correct bundle ID for your app, as you won't be able to change it if you are using the App Check feature.
4. (Optional) Enter your app's App Store ID if the app is published in Apple's App Store. The Store ID is a numeric string included in every Apple App Store URL. Open the Apple App Store app on your iOS or iPadOS device. Search for your app. Select the Share button (square and arrow up symbol). Select Copy Link . Paste the link into a text editor. The App Store ID is the final part of the URL. Example: https://apps.apple.com/app/google/id 284815942
5. (Optional) Enter your Team ID. See Locate your Team ID in the Apple Developer Account documentation for more information. Note: The Team ID field is required if you are enabling App Check for your client.
6. (Optional) Enable App Check for your iOS app. When you enable App Check, Apple's App Attest service is used to verify that OAuth 2.0 requests originating from your OAuth client are genuine and come from your app. This helps to reduce the risk of app impersonation. Learn more about enabling App Check for your iOS app .
7. Click Create .
##### UWP
1. Select the Universal Windows Platform application type.
2. Enter a name for the OAuth client. This name is displayed on your project's to identify the client.
3. Enter your app's 12-character Microsoft Store ID. You can find this value in Microsoft Partner Center on the App identity page in the App management section.
4. Click Create .
For UWP apps, the redirect URI is formed by using your application's unique Package Security Identifier (SID). You can find your app's Package SID in the Package.appxmanifest file within your Visual Studio project.
When you create your client ID in the Google Cloud console, you must specify the redirect URI in the following format, using the lowercase value of your Package SID:
```
ms-app://
YOUR_APP_PACKAGE_SID
```
For UWP apps, the custom URI scheme cannot be longer than 39 characters, as specified in the Microsoft documentation .
### Identify access scopes
Scopes enable your application to only request access to the resources that it needs while also enabling users to control the amount of access that they grant to your application. Thus, there may be an inverse relationship between the number of scopes requested and the likelihood of obtaining user consent.
Before you start implementing OAuth 2.0 authorization, we recommend that you identify the scopes that your app will need permission to access.
The YouTube Data API v3 uses the following scopes:
| Scope | Description |
| --- | --- |
| https://www. googleapis. com/ auth/ youtube | Manage your YouTube account |
| https://www. googleapis. com/ auth/ youtube. channel-memberships. creator | See a list of your current active channel members, their current level, and when they became a member |
| https://www. googleapis. com/ auth/ youtube. force-ssl | See, edit, and permanently delete your YouTube videos, ratings, comments and captions |
| https://www. googleapis. com/ auth/ youtube. readonly | View your YouTube account |
| https://www. googleapis. com/ auth/ youtube. upload | Manage your YouTube videos |
| https://www. googleapis. com/ auth/ youtubepartner | View and manage your assets and associated content on YouTube |
| https://www. googleapis. com/ auth/ youtubepartner-channel-audit | View private information of your YouTube channel relevant during the audit process with a YouTube partner |
The OAuth 2.0 API Scopes document contains a full list of scopes that you might use to access Google APIs.
## Obtaining OAuth 2.0 access tokens
The following steps show how your application interacts with Google's OAuth 2.0 server to obtain a user's consent to perform an API request on the user's behalf. Your application must have that consent before it can execute a Google API request that requires user authorization.
### Step 1: Generate a code verifier and challenge
Google supports the Proof Key for Code Exchange (PKCE) protocol to make the installed app flow more secure. A unique code verifier is created for every authorization request, and its transformed value, called "code_challenge", is sent to the authorization server to obtain the authorization code.
#### Create the code verifier
A code_verifier is a high-entropy cryptographic random string using the unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~", with a minimum length of 43 characters and a maximum length of 128 characters.
The code verifier should have enough entropy to make it impractical to guess the value.
#### Create the code challenge
Two methods of creating the code challenge are supported.
| Code Challenge Generation Methods |  |
| --- | --- |
| S256 (recommended) | The code challenge is the Base64URL (with no padding) encoded SHA256 hash of the code verifier. code_challenge = BASE64URL-ENCODE(SHA256(ASCII( code_verifier ))) |
| plain | The code challenge is the same value as the code verifier generated above. code_challenge = code_verifier |
### Step 2: Send a request to Google's OAuth 2.0 server
To obtain user authorization, send a request to Google's authorization server at https://accounts.google.com/o/oauth2/v2/auth . This endpoint handles active session lookup, authenticates the user, and obtains user consent. The endpoint is only accessible over SSL, and it refuses HTTP (non-SSL) connections.
The authorization server supports the following query string parameters for installed applications:
| Parameters |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| client_id | Required The client ID for your application. You can find this value in the Cloud Console Clients page . |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| redirect_uri | Required Determines how Google's authorization server sends a response to your app. There are several redirect options available to installed apps, and you will have set up your authorization credentials with a particular redirect method in mind. The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client, which you configured in your client's Cloud Console Clients page . If this value doesn't match an authorized URI, you will get a redirect_uri_mismatch error. The table shows the appropriate redirect_uri parameter value for each method: redirect_uri values Custom URI scheme com.example.app : redirect_uri_path or com.googleusercontent.apps.123 : redirect_uri_path com.example.app is the reverse DNS notation of a domain under your control. The custom scheme must contain a period to be valid. com.googleusercontent.apps.123 is the reverse DNS notation of the client ID. redirect_uri_path is an optional path component, such as /oauth2redirect . Note that the path should begin with a single slash, which is different from regular HTTP URLs. Loopback IP address http://127.0.0.1: port or http://[::1]: port Query your platform for the relevant loopback IP address and start an HTTP listener on a random available port. Substitute port with the actual port number your app listens on. Note that support for the loopback IP address redirect option on mobile apps is DEPRECATED . | redirect_uri values | Custom URI scheme | com.example.app : redirect_uri_path or com.googleusercontent.apps.123 : redirect_uri_path com.example.app is the reverse DNS notation of a domain under your control. The custom scheme must contain a period to be valid. com.googleusercontent.apps.123 is the reverse DNS notation of the client ID. redirect_uri_path is an optional path component, such as /oauth2redirect . Note that the path should begin with a single slash, which is different from regular HTTP URLs. | Loopback IP address | http://127.0.0.1: port or http://[::1]: port Query your platform for the relevant loopback IP address and start an HTTP listener on a random available port. Substitute port with the actual port number your app listens on. Note that support for the loopback IP address redirect option on mobile apps is DEPRECATED . |  |  |  |  |  |  |  |  |  |  |  |
| redirect_uri values |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Custom URI scheme | com.example.app : redirect_uri_path or com.googleusercontent.apps.123 : redirect_uri_path com.example.app is the reverse DNS notation of a domain under your control. The custom scheme must contain a period to be valid. com.googleusercontent.apps.123 is the reverse DNS notation of the client ID. redirect_uri_path is an optional path component, such as /oauth2redirect . Note that the path should begin with a single slash, which is different from regular HTTP URLs. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Loopback IP address | http://127.0.0.1: port or http://[::1]: port Query your platform for the relevant loopback IP address and start an HTTP listener on a random available port. Substitute port with the actual port number your app listens on. Note that support for the loopback IP address redirect option on mobile apps is DEPRECATED . |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| response_type | Required Determines whether the Google OAuth 2.0 endpoint returns an authorization code. Set the parameter value to code for installed applications. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| scope | Required A space-delimited list of scopes that identify the resources that your application could access on the user's behalf. These values inform the consent screen that Google displays to the user. Scopes enable your application to only request access to the resources that it needs while also enabling users to control the amount of access that they grant to your application. Thus, there is an inverse relationship between the number of scopes requested and the likelihood of obtaining user consent. The YouTube Data API v3 uses the following scopes: Scope Description https://www. googleapis. com/ auth/ youtube Manage your YouTube account https://www. googleapis. com/ auth/ youtube. channel-memberships. creator See a list of your current active channel members, their current level, and when they became a member https://www. googleapis. com/ auth/ youtube. force-ssl See, edit, and permanently delete your YouTube videos, ratings, comments and captions https://www. googleapis. com/ auth/ youtube. readonly View your YouTube account https://www. googleapis. com/ auth/ youtube. upload Manage your YouTube videos https://www. googleapis. com/ auth/ youtubepartner View and manage your assets and associated content on YouTube https://www. googleapis. com/ auth/ youtubepartner-channel-audit View private information of your YouTube channel relevant during the audit process with a YouTube partner The OAuth 2.0 API Scopes document provides a full list of scopes that you might use to access Google APIs. | Scope | Description | https://www. googleapis. com/ auth/ youtube | Manage your YouTube account | https://www. googleapis. com/ auth/ youtube. channel-memberships. creator | See a list of your current active channel members, their current level, and when they became a member | https://www. googleapis. com/ auth/ youtube. force-ssl | See, edit, and permanently delete your YouTube videos, ratings, comments and captions | https://www. googleapis. com/ auth/ youtube. readonly | View your YouTube account | https://www. googleapis. com/ auth/ youtube. upload | Manage your YouTube videos | https://www. googleapis. com/ auth/ youtubepartner | View and manage your assets and associated content on YouTube | https://www. googleapis. com/ auth/ youtubepartner-channel-audit | View private information of your YouTube channel relevant during the audit process with a YouTube partner |
| Scope | Description |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube | Manage your YouTube account |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. channel-memberships. creator | See a list of your current active channel members, their current level, and when they became a member |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. force-ssl | See, edit, and permanently delete your YouTube videos, ratings, comments and captions |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. readonly | View your YouTube account |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. upload | Manage your YouTube videos |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtubepartner | View and manage your assets and associated content on YouTube |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtubepartner-channel-audit | View private information of your YouTube channel relevant during the audit process with a YouTube partner |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| code_challenge | Recommended Specifies an encoded code_verifier that will be used as a server-side challenge during authorization code exchange. See create code challenge for more information. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| code_challenge_method | Recommended Specifies what method was used to encode a code_verifier that will be used during authorization code exchange. This parameter must be used with the code_challenge parameter. The value of the code_challenge_method defaults to plain if not present in the request that includes a code_challenge . The only supported values for this parameter are S256 or plain . |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| state | Recommended Specifies any string value that your application uses to maintain state between your authorization request and the authorization server's response. The server returns the exact value that you send as a name=value pair in the URL fragment identifier ( # ) of the redirect_uri after the user consents to or denies your application's access request. You can use this parameter for several purposes, such as directing the user to the correct resource in your application, sending nonces, and mitigating cross-site request forgery. Since your redirect_uri can be guessed, using a state value can increase your assurance that an incoming connection is the result of an authentication request. If you generate a random string or encode the hash of a cookie or another value that captures the client's state, you can validate the response to additionally ensure that the request and response originated in the same browser, providing protection against attacks such as cross-site request forgery . See the OpenID Connect documentation for an example of how to create and confirm a state token. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| login_hint | Optional If your application knows which user is trying to authenticate, it can use this parameter to provide a hint to the Google Authentication Server. The server uses the hint to simplify the login flow either by prefilling the email field in the sign-in form or by selecting the appropriate multi-login session. Set the parameter value to an email address or sub identifier, which is equivalent to the user's Google ID. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
#### Sample authorization URLs
The tabs below show sample authorization URLs for the different redirect URI options.
The URLs are identical except for the value of the redirect_uri parameter. The URLs also contain the required response_type and client_id parameters as well as the optional state parameter. Each URL contains line breaks and spaces for readability.
### Custom URI scheme
```
https://accounts.google.com/o/oauth2/v2/auth?
 scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly&
 response_type=code&
 state=security_token%3D138r5719ru3e1%26url%3Dhttps%3A%2F%2Foauth2.example.com%2Ftoken&
 redirect_uri=
com.example.app%3A/oauth2redirect
&
 client_id=
client_id
```
### Loopback IP address
```
https://accounts.google.com/o/oauth2/v2/auth?
 scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly&
 response_type=code&
 state=security_token%3D138r5719ru3e1%26url%3Dhttps%3A%2F%2Foauth2.example.com%2Ftoken&
 redirect_uri=
http%3A//127.0.0.1%3A9004
&
 client_id=
client_id
```
### Step 3: Google prompts user for consent
In this step, the user decides whether to grant your application the requested access. At this stage, Google displays a consent window that shows the name of your application and the Google API services that it is requesting permission to access with the user's authorization credentials and a summary of the scopes of access to be granted. The user can then consent to grant access to one or more scopes requested by your application or refuse the request.
Your application doesn't need to do anything at this stage as it waits for the response from Google's OAuth 2.0 server indicating whether any access was granted. That response is explained in the following step.
#### Errors
Requests to Google's OAuth 2.0 authorization endpoint may display user-facing error messages instead of the expected authentication and authorization flows. Common error codes and suggested resolutions are:
##### admin_policy_enforced
The Google Account is unable to authorize one or more scopes requested due to the policies of their Google Workspace administrator. See the Google Workspace Admin help article Control which third-party & internal apps access Google Workspace data for more information about how an administrator may restrict access to all scopes or sensitive and restricted scopes until access is explicitly granted to your OAuth client ID.
##### disallowed_useragent
The authorization endpoint is displayed inside an embedded user-agent disallowed by Google's OAuth 2.0 Policies .
iOS and macOS developers may encounter this error when opening authorization requests in WKWebView . Developers should instead use iOS libraries such as Google Sign-In for iOS or OpenID Foundation's AppAuth for iOS .
Web developers may encounter this error when an iOS or macOS app opens a general web link in an embedded user-agent and a user navigates to Google's OAuth 2.0 authorization endpoint from your site. Developers should allow general links to open in the default link handler of the operating system, which includes both Universal Links handlers or the default browser app. The SFSafariViewController library is also a supported option.
##### org_internal
The OAuth client ID in the request is part of a project limiting access to Google Accounts in a specific Google Cloud Organization . For more information about this configuration option see the User type section in the Setting up your OAuth consent screen help article.
##### deleted_client
The OAuth client being used to make the request has been deleted. Deletion can happen manually or automatically in the case of unused clients . Deleted clients can be restored within 30 days of the deletion. Learn more .
##### invalid_grant
If you are using a code verifier and challenge , the code_callenge parameter is invalid or missing. Ensure that the code_challenge parameter is set correctly.
When refreshing an access token , the token may have expired or has been invalidated. Authenticate the user again and ask for user consent to obtain new tokens. If you are continuing to see this error, ensure that your application has been configured correctly and that you are using the correct tokens and parameters in your request. Otherwise, the user account may have been deleted or disabled.
##### redirect_uri_mismatch
The redirect_uri passed in the authorization request does not match an authorized redirect URI for the OAuth client ID. Review authorized redirect URIs in the Google Cloud Console Clients page .
The passed redirect_uri may be invalid for the client type.
The redirect_uri parameter may refer to the OAuth out-of-band (OOB) flow that has been deprecated and is no longer supported. Refer to the migration guide to update your integration.
##### invalid_request
There was something wrong with the request you made. This could be due to a number of reasons:
- The request was not properly formatted
- The request was missing required parameters
- The request uses an authorization method that Google doesn't support. Verify your OAuth integration uses a recommended integration method
- An unsupported custom scheme was used for the redirect uri. If you see the error message Custom URI scheme is not supported on Android or Chrome apps , learn more about custom URI scheme alternatives.
### Step 4: Handle the OAuth 2.0 server response
The manner in which your application receives the authorization response depends on the redirect URI scheme that it uses. Regardless of the scheme, the response will either contain an authorization code ( code ) or an error ( error ). For example, error=access_denied indicates that the user declined the request.
If the user grants access to your application, you can exchange the authorization code for an access token and a refresh token as described in the next step.
### Step 5: Exchange authorization code for refresh and access tokens
To exchange an authorization code for an access token, call the https://oauth2.googleapis.com/token endpoint and set the following parameters:
| Fields |  |
| --- | --- |
| client_id | The client ID obtained from the Cloud Console Clients page . |
| client_secret | Optional The client secret obtained from the Cloud Console Clients page . |
| code | The authorization code returned from the initial request. |
| code_verifier | The code verifier you created in Step 1 . |
| grant_type | As defined in the OAuth 2.0 specification , this field's value must be set to authorization_code . |
| redirect_uri | One of the redirect URIs listed for your project in the Cloud Console Clients page for the given client_id . |
While the use of DPoP is optional, it is recommended for increased security. The security of DPoP relies on the private key being restricted to a single device; we recommend storing it in a way that it cannot be copied off-device, for example by using TPMs, Secure Enclaves, or other hardware-backed keystores. To use DPoP, your application must generate a new, unique DPoP proof JWT for each request to the token endpoint and add it as a HTTP request header.
| Header | Required | Description |
| --- | --- | --- |
| DPoP | Optional | A DPoP proof is a JWT that proves the possession of a private key. This is a header, not a parameter. If provided, the returned tokens are bound to this key. A new, unique proof must be generated for each request and must include htm (HTTP method) and htu (HTTP URI) claims that match the request. |
The following snippet shows a sample request:
```
POST /token HTTP/1.1
Host: oauth2.googleapis.com
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6Ik\
 VDIiwieCI6Imw4dEZyaHgtMzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCR\
 nMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFqSG10NnY5VERWclUwQ2R2R1JE\
 QSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiItQndDM0VTYzZhY2MybFRjIiwiaHRtIj\
 oiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwia\
 WF0IjoxNTYyMjYyNjE2fQ.2-GxA6T8lP4vfrg8v-FdWP0A0zdrj8igiMLvqRMUvwnQg\
 4PtFLbdLXiOSsX0x7NVY-FNyJK70nfbV37xRZT3Lg

code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7&
client_id=
your_client_id
&
redirect_uri=http://127.0.0.1:9004&
grant_type=authorization_code
```
#### Construct a DPoP proof
The following steps show how to construct a DPoP proof using OpenSSL from the command line:
1. Generate an EC P-256 key pair: openssl ecparam -name prime256v1 -genkey -noout -out dpop_private.pem openssl ec -in dpop_private.pem -pubout -out dpop_public.pem
2. Create the DPoP header: The header must include the typ , alg , and jwk (public key) claims. The x and y values are the Base64Url-encoded coordinates of your EC public key. Base64Url encode this JSON: { "typ":"dpop+jwt", "alg":"ES256", "jwk": { "kty":"EC", "x":" YOUR_PUBLIC_KEY_X ", "y":" YOUR_PUBLIC_KEY_Y ", "crv":"P-256" } }
3. Create the DPoP payload: The payload must include jti (a unique identifier for the request), htm (HTTP method, e.g., POST ), htu (HTTP URI, e.g., https://oauth2.googleapis.com/token ), and iat (issued at time). If you received a nonce from the server in a DPoP-Nonce header on the response to a previous request, you must include that nonce value in a nonce claim. The nonce claim is optional for authorization code exchanges and used only when the DPoP-Nonce header was previously received. Base64Url encode this JSON: { "jti":" JTI_VALUE ", "htm":"POST", "htu":"https://oauth2.googleapis.com/token", "iat": YOUR_JWT_ISSUED_TIME , "nonce":" SERVER_PROVIDED_NONCE " } The jti value depends on the type of exchange: For authorization code exchanges , the jti must be the Base64Url-encoded SHA256 hash of the authorization code: "jti":" BASE64URL(SHA256(AUTHORIZATION_CODE)) " . For refresh token exchanges , the jti must be a unique per-request identifier: "jti":" YOUR_UNIQUE_PER_REQUEST_IDENTIFIER " .
4. Sign the proof: Concatenate the encoded header and payload with a period ( . ), then sign the result with your private key using ES256. Note that JWS requires the signature to be in a raw R | S concatenated format (64 bytes for P-256). If using OpenSSL directly, you must convert the default ASN.1 DER-encoded signature to this raw format.
A successful exchange is indicated by a 200 OK response containing the tokens. If a valid DPoP proof is used during the exchange, the refresh token Google returns will be DPoP-bound to your key, but access tokens won't be DPoP bound. Access tokens will retain the token_type of Bearer rather than DPoP . Additionally, Google returns a DPoP-Nonce HTTP header in the response. Your client must cache this nonce and include it in the nonce claim of the DPoP proof in subsequent requests (such as when exchanging a refresh token for a new access token, or when calling DPoP-protected APIs). By using this early-issued nonce, you can avoid an extra round-trip failure ( use_dpop_nonce ) on your next request.
DPoP proofs must be included for token exchange requests made with DPoP-bound refresh tokens.
A failed exchange occurs if the DPoP header is missing when expected, invalid, or if the proof uses a different key than the one bound to the token. In these cases, the server returns a 400 Bad Request error. If the DPoP proof has mismatching htm or htu claims, an expired iat , a re-used jti , or an invalid signature, Google returns an invalid_dpop_proof error code. If a DPoP nonce is required, such as during a refresh token exchange, and the DPoP proof is missing a nonce claim, or the nonce value is unacceptable to the server (e.g., it is expired, has already been used, or is incorrect), Google returns a use_dpop_nonce error code along with a DPoP-Nonce HTTP header containing a new nonce that you can use in a subsequent request. Other failures might return invalid_grant .
Google responds to this request by returning a JSON object that contains a short-lived access token and a refresh token.
The response contains the following fields:
| Fields |  |
| --- | --- |
| access_token | The token that your application sends to authorize a Google API request. |
| expires_in | The remaining lifetime of the access token in seconds. |
| id_token | Note: This property is only returned if your request included an identity scope, such as openid , profile , or email . The value is a JSON Web Token (JWT) that contains digitally signed identity information about the user. |
| refresh_token | A token that you can use to obtain a new access token. Refresh tokens are valid until the user revokes access or the refresh token expires. If DPoP was used, the refresh token is bound to the private key used to sign the DPoP proof. Note that refresh tokens are always returned for installed applications. |
| refresh_token_expires_in | The remaining lifetime of the refresh token in seconds. This value is only set when the user grants time-based access . |
| scope | The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings. |
| token_type | The type of token returned. This value is always Bearer , even when DPoP is used. |
The following snippet shows a sample successful response headers and body when DPoP is used:
```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
DPoP-Nonce: AN3XwJjZsjnb0ZuWkRlek8QU7wY-Zhf-5IP6tO0tORz0KgtDT1Bo8FX-w4nz3r5lnepI

{
  "access_token": "1/fFAGRNJru1FTz70BzhT3Zg",
  "expires_in": 3920,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/youtube.force-ssl",
  "refresh_token": "1//xEoDL4iW3cxlI7yDbSRFYNG01kVKM2C-259HOF2aQbI"
}
```
### Step 6: Check which scopes users granted
When requesting multiple permissions (scopes), users may not grant your app access to all of them. Your app must verify which scopes were actually granted and gracefully handle situations where some permissions are denied, typically by disabling the features that rely on those denied scopes.
However, there are exceptions. Google Workspace Enterprise apps with domain-wide delegation of authority , or apps marked as Trusted , bypass the granular permissions consent screen. For these apps, users won't see the granular permission consent screen. Instead, your app will either receive all requested scopes or none.
For more detailed information, see How to handle granular permissions .
To check whether the user has granted your application access to a particular scope, exam the scope field in the access token response. The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings.
For example, the following sample access token response indicates that the user has granted your application permission to see, edit, and permanently delete user's YouTube videos, ratings, comments and captions:
```
{

    
"access_token"
:
 
"1/fFAGRNJru1FTz70BzhT3Zg"
,

    
"expires_in"
:
 
3920
,

    
"token_type"
:
 
"Bearer"
,

    
"scope"
:
 
"https://www.googleapis.com/auth/youtube.force-ssl"
,

    
"refresh_token"
:
 
"1//xEoDL4iW3cxlI7yDbSRFYNG01kVKM2C-259HOF2aQbI"

  
}
```
## Call Google APIs
After your application obtains an access token, you can use the token to make calls to a Google API on behalf of a given user account if the scope(s) of access required by the API have been granted. To do this, include the access token in a request to the API by including either an access_token query parameter or an Authorization HTTP header Bearer value. When possible, the HTTP header is preferable, because query strings tend to be visible in server logs. In most cases you can use a client library to set up your calls to Google APIs (for example, when calling the YouTube Data API ).
Note that the YouTube Data API supports service accounts only for YouTube content owners that own and manage multiple YouTube channels, such as record labels and movie studios.
You can try out all the Google APIs and view their scopes at the OAuth 2.0 Playground .
#### HTTP GET examples
A call to the youtube.channels endpoint (the YouTube Data API) using the Authorization: Bearer HTTP header might look like the following. Note that you need to specify your own access token: GET /youtube/v3/channels?part=snippet&mine=true HTTP/1.1 Host: www.googleapis.com Authorization: Bearer access_token Here is a call to the same API for the authenticated user using the access_token query string parameter: GET https://www.googleapis.com/youtube/v3/channels?access_token= access_token &part=snippet&mine=true curl examples You can test these commands with the curl command-line application. Here's an example that uses the HTTP header option (preferred): curl -H "Authorization: Bearer access_token " https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true Or, alternatively, the query string parameter option: curl https://www.googleapis.com/youtube/v3/channels?access_token= access_token &part=snippet&mine=true Refresh an access token Access tokens periodically expire and become invalid credentials for a related API request. You can refresh an access token without prompting the user for permission (including when the user is not present) if you requested offline access to the scopes associated with the token. To refresh an access token, your application sends an HTTPS POST request to Google's authorization server ( https://oauth2.googleapis.com/token ) that includes the following parameters in the request body: Name Value client_id The client ID obtained from the API Console . client_secret Optional The client secret obtained from the API Console . (The client_secret is not applicable to requests from clients registered as Android, iOS, or Chrome applications.) grant_type As defined in the OAuth 2.0 specification , this field's value must be set to refresh_token . refresh_token The refresh token returned from the authorization code exchange. While the use of DPoP is optional, it is recommended for increased security. To use DPoP with a refresh token, your application must generate a new, unique DPoP proof JWT for each request to the token endpoint. This proof must be signed with the same private key that was used during the initial authorization code exchange. Your application adds the proof as a HTTP request header. Header Required Description DPoP Optional A DPoP proof is a JWT that proves the possession of a private key. This is a header, not a parameter. If provided, the returned tokens are bound to this key. A new, unique proof must be generated for each request and must include htm (HTTP method) and htu (HTTP URI) claims that match the request. The following snippet shows a sample request: POST /token HTTP/1.1 Host: oauth2.googleapis.com Content-Type: application/x-www-form-urlencoded DPoP: DPOP_PROOF_JWT client_id= your_client_id & refresh_token= refresh_token & grant_type=refresh_token To use DPoP with a refresh token, you must generate a new, unique DPoP proof JWT for the request. See Construct a DPoP proof for step-by-step instructions on generating the key pair and constructing the JWT. A successful exchange is indicated by a 200 OK response containing a new access token. When DPoP is used, the token_type is Bearer . A successful response confirms the DPoP proof for the refresh token was accepted. Google may also return a new DPoP-Nonce HTTP header in the response; if returned, your client must cache this nonce and include it in the nonce claim of the DPoP proof in subsequent requests. A failed exchange occurs if the DPoP header is missing, invalid, or uses an incorrect key. For details on specific DPoP error codes and handling nonces, see Failed exchange . The following snippet shows a sample successful response headers and body when DPoP is used: HTTP/1.1 200 OK Content-Type: application/json; charset=utf-8 DPoP-Nonce: AN3XwJjZsjnb0ZuWkRlek8QU7wY-Zhf-5IP6tO0tORz0KgtDT1Bo8FX-w4nz3r5lnepI { "access_token": "1/fFAGRNJru1FTz70BzhT3Zg", "expires_in": 3920, "scope": "https://www.googleapis.com/auth/drive.metadata.readonly", "token_type": "Bearer" } Note that there are limits on the number of refresh tokens that will be issued; one limit per client/user combination, and another per user across all clients. You should save refresh tokens in long-term storage and continue to use them as long as they remain valid. If your application requests too many refresh tokens, it may run into these limits, in which case older refresh tokens will stop working. Token revocation In some cases a user may wish to revoke access given to an application. A user can revoke access by visiting Account Settings . See the Remove site or app access section of the Third-party sites & apps with access to your account support document for more information. It is also possible for an application to programmatically revoke the access given to it. Programmatic revocation is important in instances where a user unsubscribes, removes an application, or the API resources required by an app have significantly changed. In other words, part of the removal process can include an API request to ensure the permissions previously granted to the application are removed. To programmatically revoke a token, your application makes a request to https://oauth2.googleapis.com/revoke and includes the token as a parameter: curl -d -X -POST --header "Content-type:application/x-www-form-urlencoded" \ https://oauth2.googleapis.com/revoke?token= {token} The token can be an access token or a refresh token. If the token is an access token and it has a corresponding refresh token, the refresh token will also be revoked. If the revocation is successfully processed, then the HTTP status code of the response is 200 . For error conditions, an HTTP status code 400 is returned along with an error code. App redirect methods Custom URI scheme Custom URI schemes are a form of deeplinking that use a custom-defined scheme to open your app. Alternative to using custom URI schemes on Chrome apps Use the Chrome Identity API which delivers the OAuth 2.0 response directly to your app, eliminating the need for a redirect URI. Loopback IP address (macOS, Linux, Windows desktop) To receive the authorization code using this URL, your application must be listening on the local web server. That is possible on many, but not all, platforms. However, if your platform supports it, this is the recommended mechanism for obtaining the authorization code. When your app receives the authorization response, for best usability it should respond by displaying an HTML page that instructs the user to close the browser and return to your app. Recommended usage macOS, Linux, and Windows desktop (but not Universal Windows Platform) apps Form values Set the application type to Desktop app . Manual copy/paste (Deprecated) Protect your apps Verify app ownership for Chrome You can verify ownership of your application to reduce the risk of app impersonation. To complete the verification process, you would use your Chrome Web Store Developer account. The following requirements must be met for a successful verification: You must have a registered item in the Chrome Web Store Developer Dashboard with the same item ID as the Chrome Extension OAuth client you are completing the verification for. You must be a publisher for the Chrome Web Store item. Learn more about access management in the Chrome Web Store Developer Dashboard. In the Verify App Ownership section of the Chrome Extension client, click the Verify Ownership button to complete the verification process. Note: Wait a few minutes before completing the verification process after granting access to your account. If the verification is successful, a notification will be displayed to confirm the success of the verification process. Otherwise, an error prompt will be shown. To fix a failed verification, try the following: Make sure there is a registered item in the Chrome Web Store Developer Dashboard with the same item ID as the Chrome Extension OAuth client you are completing the verification for. Make sure you are a publisher for the app, that is, you must either be the individual publisher of the app or a member of the group publisher of the app. Learn more about access management in the Chrome Web Store Developer Dashboard. If you just updated your group publisher list, verify that the group publisher membership list is synced in the Chrome Web Store Developer Dashboard. Learn more about syncing your publisher membership list. App Check (iOS only) The App Check feature helps safeguard your iOS applications from unauthorized usage by using Apple's App Attest service to verify that requests made to Google OAuth 2.0 endpoints originate from your authentic applications. This helps to reduce the risk of app impersonation. Enable App Check for your iOS Client The following requirements must be met to successfully enable App Check for your iOS client: You must specify a team ID for your iOS client. You must not use a wildcard in your bundle ID since it can resolve to more than one app. This means that the bundle ID must not include the asterisk (*) symbol. To enable App Check, turn on the Protect your OAuth client from abuse with Firebase App Check toggle button in the edit view of your iOS client. After enabling App Check, you will start seeing metrics related to OAuth requests from your client in the edit view of the OAuth client. Requests from unverified sources won't be blocked until you enforce App Check . The information in the metrics monitoring page can help you determine when to start enforcement. You might see errors related to the App Check feature when enabling App Check for your iOS app. To fix these errors, try the following: Verify that the bundle ID and team ID you specified are valid. Verify that you are not using a wildcard for the bundle ID. Enforce App Check for your iOS Client Enabling App Check for your app does not automatically block unrecognized requests. To enforce this protection, go to the edit view of your iOS client. There, you will see App Check metrics to the right of the page under the Google Identity for iOS section. The metrics include the following information: Number of verified requests - requests that have a valid App Check token. After you enable App Check enforcement, only requests in this category will succeed. Number of unverified requests: likely outdated client requests - requests missing an App Check token; these request may be from an older version of your app that doesn't include an App Check implementation. Number of unverified requests: unknown origin requests - requests missing an App Check token that don't look like they are coming from your app. Number of unverified requests: invalid requests - requests with an invalid App Check token, which may be from an inauthentic client attempting to impersonate your app, or from emulated environments. Review these metrics to understand how enforcing App Check will affect your users. To enforce App Check, click the ENFORCE button and confirm your choice. Once enforcement is active, all unverified requests from your client will be rejected. Note : after you enable enforcement, it can take up to 15 minutes for the changes to take effect. Unenforce App Check for your iOS Client Unenforcing App Check for your app will stop enforcement and will allow all requests from your client to Google OAuth 2.0 endpoints, including unverified requests. To unenforce App Check for your iOS client, navigate to the edit view of the iOS client and click the UNENFORCE button and confirm your choice. Note : after unenforcing App Check, it can take up to 15 minutes for the changes to take effect. Disable App Check for your iOS Client Disabling App Check for your app will stop all App Check monitoring and enforcement . Consider unenforcing App Check instead so you can continue monitoring metrics for your client. To disable App Check for your iOS client, navigate to the edit view of the iOS client and turn off the Protect your OAuth client from abuse with Firebase App Check toggle button. Note : after disabling App Check, it can take up to 15 minutes for the changes to take effect. Time-based access Time-based access allows a user to grant your app access to their data for a limited duration to complete an action. Time-based access is available in select Google products during the consent flow, giving users the option to grant access for a limited period of time. An example is the Data Portability API which enables a one-time transfer of data. When a user grants your application time-based access, the refresh token will expire after the specified duration. Note that refresh tokens may be invalidated earlier under specific circumstances; see these cases for details. The refresh_token_expires_in field returned in the authorization code exchange response represents the time remaining until the refresh token expires in such cases. Further Reading The IETF Best Current Practice OAuth 2.0 for Native Apps establishes many of the best practices documented here. Implement Cross-Account Protection An additional step you should take to protect your users' accounts is implementing Cross-Account Protection by utilizing Google's Cross-Account Protection Service. This service lets you subscribe to security event notifications which provide information to your application about major changes to the user account. You can then use the information to take action depending on how you decide to respond to events. Some examples of the event types sent to your app by Google's Cross-Account Protection Service are: https://schemas.openid.net/secevent/risc/event-type/sessions-revoked https://schemas.openid.net/secevent/oauth/event-type/token-revoked https://schemas.openid.net/secevent/risc/event-type/account-disabled See the Protect user accounts with Cross-Account Protection page for more information on how to implement Cross Account Protection and for the full list of available events.