# Using OAuth 2.0 for Web Server Applications Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- OAuth 2.0 enables web server applications to securely access user data from Google APIs, such as the YouTube Data API, without exposing sensitive credentials.
- Applications must define specific permissions (scopes) they require and use the client_secret.json file for client configuration, storing sensitive information like client ID, client secret, and redirect URIs.
- The authorization process involves redirecting the user to Google for consent, handling the response, and exchanging the received authorization code for access and refresh tokens, which must be stored securely.
- Security is paramount, requiring the use of the state parameter to prevent CSRF attacks, the use of HTTPS, and validation of redirect URIs to ensure they are correctly configured and authorized.
- Applications can use client libraries for various programming languages (Go, Java, .NET, Node.js, PHP, Python, Ruby) or directly interact with OAuth 2.0 endpoints via HTTP/REST to implement the authorization process, as well as having the ability to request incremental authorization and token revocation.
This document explains how web server applications use Google API Client Libraries or Google OAuth 2.0 endpoints to implement OAuth 2.0 authorization to access the YouTube Data API.
OAuth 2.0 allows users to share specific data with an application while keeping their usernames, passwords, and other information private. For example, an application can use OAuth 2.0 to obtain permission to upload videos to a user's YouTube channel.
This OAuth 2.0 flow is specifically for user authorization. It is designed for applications that can store confidential information and maintain state. A properly authorized web server application can access an API while the user interacts with the application or after the user has left the application.
Web server applications frequently also use service accounts to authorize API requests, particularly when calling Cloud APIs to access project-based data rather than user-specific data. Web server applications can use service accounts in conjunction with user authorization. Note that the YouTube Data API supports the service account flow only for YouTube content owners that own and manage multiple YouTube channels. Specifically, content owners can use service accounts to call API methods that support the onBehalfOfContentOwner request parameter.
## Client libraries
The language-specific examples on this page use Google API Client Libraries to implement OAuth 2.0 authorization. To run the code samples, you must first install the client library for your language.
When you use a Google API Client Library to handle your application's OAuth 2.0 flow, the client library performs many actions that the application would otherwise need to handle on its own. For example, it determines when the application can use or refresh stored access tokens as well as when the application must reacquire consent. The client library also generates correct redirect URLs and helps to implement redirect handlers that exchange authorization codes for access tokens.
Google API Client Libraries for server-side applications are available for the following languages:
- Go
- Java
- .NET
- Node.js
- Dart
- PHP
- Python
- Ruby
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
2. Click Create Client .
3. Select the Web application application type.
4. Fill in the form and click Create . Applications that use languages and frameworks like PHP, Java, Python, Ruby, and .NET must specify authorized redirect URIs . The redirect URIs are the endpoints to which the OAuth 2.0 server can send responses. These endpoints must adhere to Google's validation rules . For testing, you can specify URIs that refer to the local machine, such as http://localhost:8080 . All of the examples in this document use http://localhost:8080 as the redirect URI. We recommend that you design your app's auth endpoints so that your application does not expose authorization codes to other resources on the page.
After creating your credentials, download the client_secret.json file from the API Console. Securely store the file in a location that only your application can access.
### Identify access scopes
Scopes enable your application to only request access to the resources that it needs while also enabling users to control the amount of access that they grant to your application. Thus, there may be an inverse relationship between the number of scopes requested and the likelihood of obtaining user consent.
Before you start implementing OAuth 2.0 authorization, we recommend that you identify the scopes that your app will need permission to access.
We also recommend that your application request access to authorization scopes via an incremental authorization process, in which your application requests access to user data in context. This best practice helps users to more easily understand why your application needs the access it is requesting.
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
### Language-specific requirements
To run any of the code samples in this document, you'll need a Google Account, access to the Internet, and a web browser. If you are using one of the API client libraries, also see the language-specific requirements in the following sections.
### PHP
To run the PHP code samples in this document, you'll need:
- PHP 8.0 or greater with the command-line interface (CLI) and JSON extension installed.
- The Composer dependency management tool.
- The Google APIs Client Library for PHP: composer require google/apiclient:^2.15.0
See Google APIs Client Library for PHP for more information.
### Python
To run the Python code samples in this document, you'll need:
- Python 3.7 or greater
- The pip package management tool.
- The Google APIs Client Library for Python 2.0 release: pip install --upgrade google-api-python-client
- The google-auth , google-auth-oauthlib , and google-auth-httplib2 for user authorization. pip install --upgrade google-auth google-auth-oauthlib google-auth-httplib2
- The Flask Python web application framework. pip install --upgrade flask
- The requests HTTP library. pip install --upgrade requests
Review the Google API Python client library release note if you aren't able to upgrade python and associated migration guide.
### Ruby
To run the Ruby code samples in this document, you'll need:
- Ruby 2.6 or greater
- The Google Auth Library for Ruby: gem install googleauth
- The Sinatra Ruby web application framework. gem install sinatra
### Node.js
To run the Node.js code samples in this document, you'll need:
- The maintenance LTS, active LTS, or current release of Node.js.
- The Google APIs Node.js Client: npm install googleapis crypto express express-session
### HTTP/REST
You don't need to install any libraries to be able to directly call the OAuth 2.0 endpoints.
## Obtaining OAuth 2.0 access tokens
The following steps show how your application interacts with Google's OAuth 2.0 server to obtain a user's consent to perform an API request on the user's behalf. Your application must have that consent before it can execute a Google API request that requires user authorization.
The following list quickly summarizes these steps:
1. Your application identifies the permissions it needs.
2. Your application redirects the user to Google along with the list of requested permissions.
3. The user decides whether to grant the permissions to your application.
4. Your application finds out what the user decided.
5. If the user granted the requested permissions, your application retrieves tokens needed to make API requests on the user's behalf.
### Step 1: Set authorization parameters
Your first step is to create the authorization request. That request sets parameters that identify your application and define the permissions that the user will be asked to grant to your application.
- If you use a Google client library for OAuth 2.0 authentication and authorization, you create and configure an object that defines these parameters.
- If you call the Google OAuth 2.0 endpoint directly, you'll generate a URL and set the parameters on that URL.
The following tabs define the supported authorization parameters for web server applications. The language-specific examples also show how to use a client library or authorization library to configure an object that sets those parameters:
### PHP
The following code snippet creates a Google\Client() object, which defines the parameters in the authorization request.
That object uses information from your client_secret.json file to identify your application. (See creating authorization credentials for more about that file.) The object also identifies the scopes that your application is requesting permission to access and the URL to your application's auth endpoint, which will handle the response from Google's OAuth 2.0 server. Finally, the code sets the optional access_type and include_granted_scopes parameters.
For example, this code requests offline access to manage a user's YouTube account:
```
use Google\Client;

$client = new Client();

// Required, call the setAuthConfig function to load authorization credentials from

// client_secret.json file.

$client->setAuthConfig('client_secret.json');

// Required, to set the scope value, call the addScope function

$client->addScope(GOOGLE_SERVICE_YOUTUBE::YOUTUBE_FORCE_SSL);

// Required, call the setRedirectUri function to specify a valid redirect URI for the

// provided client_id

$client->setRedirectUri('http://' . $_SERVER['HTTP_HOST'] . '/oauth2callback.php');

// Recommended, offline access will give you both an access and refresh token so that

// your app can refresh the access token without user interaction.

$client->setAccessType('offline');

// Recommended, call the setState function. Using a state value can increase your assurance that

// an incoming connection is the result of an authentication request.

$client->setState($sample_passthrough_value);

// Optional, if your application knows which user is trying to authenticate, it can use this

// parameter to provide a hint to the Google Authentication Server.

$client->setLoginHint('hint@example.com');

// Optional, call the setPrompt function to set "consent" will prompt the user for consent

$client->setPrompt('consent');

// Optional, call the setIncludeGrantedScopes function with true to enable incremental

// authorization

$client->setIncludeGrantedScopes(true);
```
### Python
The following code snippet uses the google-auth-oauthlib.flow module to construct the authorization request.
The code constructs a Flow object, which identifies your application using information from the client_secret.json file that you downloaded after creating authorization credentials . That object also identifies the scopes that your application is requesting permission to access and the URL to your application's auth endpoint, which will handle the response from Google's OAuth 2.0 server. Finally, the code sets the optional access_type and include_granted_scopes parameters.
For example, this code requests offline access to manage a user's YouTube account:
```
import
 
google.oauth2.credentials

import
 
google_auth_oauthlib.flow

# Required, call the from_client_secrets_file method to retrieve the client ID from a

# client_secret.json file. The client ID (from that file) and access scopes are required. (You can

# also use the from_client_config method, which passes the client configuration as it originally

# appeared in a client secrets file but doesn't access the file itself.)

flow
 
=
 
google_auth_oauthlib
.
flow
.
Flow
.
from_client_secrets_file
(
'client_secret.json'
,

    
scopes
=
[
'https://www.googleapis.com/auth/youtube.force-ssl'
])

# Required, indicate where the API server will redirect the user after the user completes

# the authorization flow. The redirect URI is required. The value must exactly

# match one of the authorized redirect URIs for the OAuth 2.0 client, which you

# configured in the API Console. If this value doesn't match an authorized URI,

# you will get a 'redirect_uri_mismatch' error.

flow
.
redirect_uri
 
=
 
'https://www.example.com/oauth2callback'

# Generate URL for request to Google's OAuth 2.0 server.

# Use 
kwargs
 to set optional request parameters.

authorization_url
,
 
state
 
=
 
flow
.
authorization_url
(

    
# Recommended, enable offline access so that you can refresh an access token without

    
# re-prompting the user for permission. Recommended for web server apps.

    
access_type
=
'offline'
,

    
# Optional, enable incremental authorization. Recommended as a best practice.

    
include_granted_scopes
=
'true'
,

    
# Optional, if your application knows which user is trying to authenticate, it can use this

    
# parameter to provide a hint to the Google Authentication Server.

    
login_hint
=
'hint@example.com'
,

    
# Optional, set prompt to 'consent' will prompt the user for consent

    
prompt
=
'consent'
)
```
### Ruby
Use the client_secrets.json file that you created to configure a client object in your application. When you configure a client object, you specify the scopes your application needs to access, along with the URL to your application's auth endpoint, which will handle the response from the OAuth 2.0 server.
For example, this code requests offline access to manage a user's YouTube account:
```
require
 
'googleauth'

require
 
'googleauth/web_user_authorizer'

require
 
'googleauth/stores/redis_token_store'

require
 
'google/apis/youtube_v3'

# Required, call the from_file method to retrieve the client ID from a

# client_secret.json file.

client_id
 
=
 
Google
::
Auth
::
ClientId
.
from_file
(
'/path/to/client_secret.json'
)

# Required, scope value 

scope
 
=
 
'https://www.googleapis.com/auth/youtube.force-ssl'

# Required, Authorizers require a storage instance to manage long term persistence of

# access and refresh tokens.

token_store
 
=
 
Google
::
Auth
::
Stores
::
RedisTokenStore
.
new
(
redis
:
 
Redis
.
new
)

# Required, indicate where the API server will redirect the user after the user completes

# the authorization flow. The redirect URI is required. The value must exactly

# match one of the authorized redirect URIs for the OAuth 2.0 client, which you

# configured in the API Console. If this value doesn't match an authorized URI,

# you will get a 'redirect_uri_mismatch' error.

callback_uri
 
=
 
'/oauth2callback'

# To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI

# from the client_secret.json file. To get these credentials for your application, visit

# https://console.cloud.google.com/apis/credentials.

authorizer
 
=
 
Google
::
Auth
::
WebUserAuthorizer
.
new
(
client_id
,
 
scope
,

                                                
token_store
,
 
callback_uri
)
```
Your application uses the client object to perform OAuth 2.0 operations, such as generating authorization request URLs and applying access tokens to HTTP requests.
### Node.js
The following code snippet creates a google.auth.OAuth2 object, which defines the parameters in the authorization request.
That object uses information from your client_secret.json file to identify your application. To ask for permissions from a user to retrieve an access token, you redirect them to a consent page. To create a consent page URL:
```
const
 
{
google
}
 
=
 
require
(
'googleapis'
);

const
 
crypto
 
=
 
require
(
'crypto'
);

const
 
express
 
=
 
require
(
'express'
);

const
 
session
 
=
 
require
(
'express-session'
);

/**

 * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI

 * from the client_secret.json file. To get these credentials for your application, visit

 * https://console.cloud.google.com/apis/credentials.

 */

const
 
oauth2Client
 
=
 
new
 
google
.
auth
.
OAuth2
(

  
YOUR_CLIENT_ID
,

  
YOUR_CLIENT_SECRET
,

  
YOUR_REDIRECT_URL

);

// Access scopes for YouTube API

const
 
scopes
 
=
 
[

  
'https://www.googleapis.com/auth/youtube.force-ssl'

];

// Generate a secure random state value.

const
 
state
 
=
 
crypto
.
randomBytes
(
32
).
toString
(
'hex'
);

// Store state in the session

req
.
session
.
state
 
=
 
state
;

// Generate a url that asks permissions for the Drive activity and Google Calendar scope

const
 
authorizationUrl
 
=
 
oauth2Client
.
generateAuthUrl
({

  
// 'online' (default) or 'offline' (gets refresh_token)

  
access_type
:
 
'offline'
,

  
/** Pass in the scopes array defined above.

    * Alternatively, if only one scope is needed, you can pass a scope URL as a string */

  
scope
:
 
scopes
,

  
// Enable incremental authorization. Recommended as a best practice.

  
include_granted_scopes
:
 
true
,

  
// Include the state parameter to reduce the risk of CSRF attacks.

  
state
:
 
state

});
```
Important Note - The refresh_token is only returned on the first authorization. More details here .
### HTTP/REST
Google's OAuth 2.0 endpoint is at https://accounts.google.com/o/oauth2/v2/auth . This endpoint is accessible only over HTTPS. Plain HTTP connections are refused.
The Google authorization server supports the following query string parameters for web server applications:
| Parameters |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| client_id | Required The client ID for your application. You can find this value in the Cloud Console Clients page . |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| redirect_uri | Required Determines where the API server redirects the user after the user completes the authorization flow. The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client, which you configured in your client's Cloud Console Clients page . If this value doesn't match an authorized redirect URI for the provided client_id you will get a redirect_uri_mismatch error. Note that the http or https scheme, case, and trailing slash (' / ') must all match. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| response_type | Required Determines whether the Google OAuth 2.0 endpoint returns an authorization code. Set the parameter value to code for web server applications. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| scope | Required A space-delimited list of scopes that identify the resources that your application could access on the user's behalf. These values inform the consent screen that Google displays to the user. Scopes enable your application to only request access to the resources that it needs while also enabling users to control the amount of access that they grant to your application. Thus, there is an inverse relationship between the number of scopes requested and the likelihood of obtaining user consent. The YouTube Data API v3 uses the following scopes: Scope Description https://www. googleapis. com/ auth/ youtube Manage your YouTube account https://www. googleapis. com/ auth/ youtube. channel-memberships. creator See a list of your current active channel members, their current level, and when they became a member https://www. googleapis. com/ auth/ youtube. force-ssl See, edit, and permanently delete your YouTube videos, ratings, comments and captions https://www. googleapis. com/ auth/ youtube. readonly View your YouTube account https://www. googleapis. com/ auth/ youtube. upload Manage your YouTube videos https://www. googleapis. com/ auth/ youtubepartner View and manage your assets and associated content on YouTube https://www. googleapis. com/ auth/ youtubepartner-channel-audit View private information of your YouTube channel relevant during the audit process with a YouTube partner The OAuth 2.0 API Scopes document provides a full list of scopes that you might use to access Google APIs. We recommend that your application request access to authorization scopes in context whenever possible. By requesting access to user data in context, using incremental authorization , you help users to understand why your application needs the access it is requesting. | Scope | Description | https://www. googleapis. com/ auth/ youtube | Manage your YouTube account | https://www. googleapis. com/ auth/ youtube. channel-memberships. creator | See a list of your current active channel members, their current level, and when they became a member | https://www. googleapis. com/ auth/ youtube. force-ssl | See, edit, and permanently delete your YouTube videos, ratings, comments and captions | https://www. googleapis. com/ auth/ youtube. readonly | View your YouTube account | https://www. googleapis. com/ auth/ youtube. upload | Manage your YouTube videos | https://www. googleapis. com/ auth/ youtubepartner | View and manage your assets and associated content on YouTube | https://www. googleapis. com/ auth/ youtubepartner-channel-audit | View private information of your YouTube channel relevant during the audit process with a YouTube partner |
| Scope | Description |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube | Manage your YouTube account |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. channel-memberships. creator | See a list of your current active channel members, their current level, and when they became a member |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. force-ssl | See, edit, and permanently delete your YouTube videos, ratings, comments and captions |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. readonly | View your YouTube account |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtube. upload | Manage your YouTube videos |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtubepartner | View and manage your assets and associated content on YouTube |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| https://www. googleapis. com/ auth/ youtubepartner-channel-audit | View private information of your YouTube channel relevant during the audit process with a YouTube partner |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| access_type | Recommended Indicates whether your application can refresh access tokens when the user is not present at the browser. Valid parameter values are online , which is the default value, and offline . Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser. This is the method of refreshing access tokens described later in this document. This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| state | Recommended Specifies any string value that your application uses to maintain state between your authorization request and the authorization server's response. The server returns the exact value that you send as a name=value pair in the URL query component ( ? ) of the redirect_uri after the user consents to or denies your application's access request. You can use this parameter for several purposes, such as directing the user to the correct resource in your application, sending nonces, and mitigating cross-site request forgery. Since your redirect_uri can be guessed, using a state value can increase your assurance that an incoming connection is the result of an authentication request. If you generate a random string or encode the hash of a cookie or another value that captures the client's state, you can validate the response to additionally ensure that the request and response originated in the same browser, providing protection against attacks such as cross-site request forgery . See the OpenID Connect documentation for an example of how to create and confirm a state token. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| include_granted_scopes | Optional Enables applications to use incremental authorization to request access to additional scopes in context. If you set this parameter's value to true and the authorization request is granted, then the new access token will also cover any scopes to which the user previously granted the application access. See the incremental authorization section for examples. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| enable_granular_consent | Optional Defaults to true . If set to false , more granular Google Account permissions will be disabled for OAuth client IDs created before 2019. No effect for newer OAuth client IDs, since more granular permissions is always enabled for them. When Google enables granular permissions for an application, this parameter will no longer have any effect. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| login_hint | Optional If your application knows which user is trying to authenticate, it can use this parameter to provide a hint to the Google Authentication Server. The server uses the hint to simplify the login flow either by prefilling the email field in the sign-in form or by selecting the appropriate multi-login session. Set the parameter value to an email address or sub identifier, which is equivalent to the user's Google ID. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| prompt | Optional A space-delimited, case-sensitive list of prompts to present the user. If you don't specify this parameter, the user will be prompted only the first time your project requests access. See Prompting re-consent for more information. Possible values are: none Don't display any authentication or consent screens. Must not be specified with other values. consent Prompt the user for consent. select_account Prompt the user to select an account. | none | Don't display any authentication or consent screens. Must not be specified with other values. | consent | Prompt the user for consent. | select_account | Prompt the user to select an account. |  |  |  |  |  |  |  |  |  |  |
| none | Don't display any authentication or consent screens. Must not be specified with other values. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| consent | Prompt the user for consent. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| select_account | Prompt the user to select an account. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
### Step 2: Redirect to Google's OAuth 2.0 server
Redirect the user to Google's OAuth 2.0 server to initiate the authentication and authorization process. Typically, this occurs when your application first needs to access the user's data. In the case of incremental authorization , this step also occurs when your application first needs to access additional resources that it does not have permission to access.
### PHP
1. Generate a URL to request access from Google's OAuth 2.0 server: $auth_url = $client->createAuthUrl();
2. Redirect the user to $auth_url : header('Location: ' . filter_var($auth_url, FILTER_SANITIZE_URL));
### Python
This example shows how to redirect the user to the authorization URL using the Flask web application framework:
```
return
 
flask
.
redirect
(
authorization_url
)
```
### Ruby
1. Generate a URL to request access from Google's OAuth 2.0 server: auth_uri = authorizer . get_authorization_url ( request : request )
2. Redirect the user to auth_uri .
### Node.js
1. Use the generated URL authorizationUrl from Step 1 generateAuthUrl method to request access from Google's OAuth 2.0 server.
2. Redirect the user to authorizationUrl . res . redirect ( authorizationUrl );
### HTTP/REST
#### Sample redirect to Google's authorization server
The sample URL below requests offline access ( access_type=offline ) to a scope that permits access to view the user's YouTube account. It uses incremental authorization to ensure that the new access token covers any scopes to which the user previously granted the application access. The URL also sets values for the required redirect_uri , response_type , and client_id parameters as well as for the state parameter. The URL contains line breaks and spaces for readability.
```
https://accounts.google.com/o/oauth2/v2/auth?
 scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly&
 access_type=offline&
 include_granted_scopes=true&
 state=state_parameter_passthrough_value&
 redirect_uri=http%3A%2F%2Flocalhost%2Foauth2callback&
 response_type=code&
 client_id=
client_id
```
After you create the request URL, redirect the user to it.
Google's OAuth 2.0 server authenticates the user and obtains consent from the user for your application to access the requested scopes. The response is sent back to your application using the redirect URL you specified.
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
##### invalid_client
The OAuth client secret is incorrect. Review the OAuth client configuration , including the client ID and secret used for this request.
##### deleted_client
The OAuth client being used to make the request has been deleted. Deletion can happen manually or automatically in the case of unused clients . Deleted clients can be restored within 30 days of the deletion. Learn more .
##### invalid_grant
When refreshing an access token or using incremental authorization , the token may have expired or has been invalidated. Authenticate the user again and ask for user consent to obtain new tokens. If you are continuing to see this error, ensure that your application has been configured correctly and that you are using the correct tokens and parameters in your request. Otherwise, the user account may have been deleted or disabled.
##### redirect_uri_mismatch
The redirect_uri passed in the authorization request does not match an authorized redirect URI for the OAuth client ID. Review authorized redirect URIs in the Google Cloud Console Clients page .
The redirect_uri parameter may refer to the OAuth out-of-band (OOB) flow that has been deprecated and is no longer supported. Refer to the migration guide to update your integration.
##### invalid_request
There was something wrong with the request you made. This could be due to a number of reasons:
- The request was not properly formatted
- The request was missing required parameters
- The request uses an authorization method that Google doesn't support. Verify your OAuth integration uses a recommended integration method
### Step 4: Handle the OAuth 2.0 server response
The OAuth 2.0 server responds to your application's access request by using the URL specified in the request.
If the user approves the access request, then the response contains an authorization code. If the user does not approve the request, the response contains an error message. The authorization code or error message that is returned to the web server appears on the query string, as shown in the following examples:
An error response:
```
https://oauth2.example.com/auth?error=access_denied
```
An authorization code response:
```
https://oauth2.example.com/auth?code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7
```
#### Sample OAuth 2.0 server response
You can test this flow by clicking on the following sample URL, which requests read-only access to view metadata for files in your Google Drive and read-only access to view your Google Calendar events:
```
https://accounts.google.com/o/oauth2/v2/auth?
 scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly&
 access_type=offline&
 include_granted_scopes=true&
 state=state_parameter_passthrough_value&
 redirect_uri=http%3A%2F%2Flocalhost%2Foauth2callback&
 response_type=code&
 client_id=
client_id
```
After completing the OAuth 2.0 flow, your browser redirects you to the OAuth 2.0 Playground , a tool for testing OAuth flows. You will see that the OAuth 2.0 Playground has automatically captured the authorization code.
### Step 5: Exchange authorization code for refresh and access tokens
After the web server receives the authorization code, it can exchange the authorization code for an access token.
### PHP
To exchange an authorization code for an access token, use the fetchAccessTokenWithAuthCode method:
```
$access_token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
```
### Python
On your callback page, use the google-auth library to verify the authorization server response. Then, use the flow.fetch_token method to exchange the authorization code in that response for an access token:
```
state
 
=
 
flask
.
session
[
'state'
]

flow
 
=
 
google_auth_oauthlib
.
flow
.
Flow
.
from_client_secrets_file
(

    
'client_secret.json'
,

    
scopes
=
[
'https://www.googleapis.com/auth/youtube.force-ssl'
],

    
state
=
state
)

flow
.
redirect_uri
 
=
 
flask
.
url_for
(
'oauth2callback'
,
 
_external
=
True
)

authorization_response
 
=
 
flask
.
request
.
url

flow
.
fetch_token
(
authorization_response
=
authorization_response
)

# Store the credentials in browser session storage, but for security: client_id, client_secret,

# and token_uri are instead stored only on the backend server.

credentials
 
=
 
flow
.
credentials

flask
.
session
[
'credentials'
]
 
=
 
{

    
'token'
:
 
credentials
.
token
,

    
'refresh_token'
:
 
credentials
.
refresh_token
,

    
'granted_scopes'
:
 
credentials
.
granted_scopes
}
```
### Ruby
On your callback page, use the googleauth library to verify the authorization server response. Use the authorizer.handle_auth_callback_deferred method to save the authorization code and redirect back to the URL that originally requested authorization. This defers the exchange of the code by temporarily stashing the results in the user's session.
```
target_url
 
=
 
Google
::
Auth
::
WebUserAuthorizer
.
handle_auth_callback_deferred
(
request
)

  
redirect
 
target_url
```
### Node.js
To exchange an authorization code for an access token, use the getToken method:
```
const
 
url
 
=
 
require
(
'url'
);

// Receive the callback from Google's OAuth 2.0 server.

app
.
get
(
'/oauth2callback'
,
 
async
 
(
req
,
 
res
)
 
=>
 
{

  
let
 
q
 
=
 
url
.
parse
(
req
.
url
,
 
true
).
query
;

  
if
 
(
q
.
error
)
 
{
 
// An error response e.g. error=access_denied

    
console
.
log
(
'Error:'
 
+
 
q
.
error
);

  
}
 
else
 
if
 
(
q
.
state
 
!==
 
req
.
session
.
state
)
 
{
 
//check state value

    
console
.
log
(
'State mismatch. Possible CSRF attack'
);

    
res
.
end
(
'State mismatch. Possible CSRF attack'
);

  
}
 
else
 
{
 
// Get access and refresh tokens (if access_type is offline)

    
let
 
{
 
tokens
 
}
 
=
 
await
 
oauth2Client
.
getToken
(
q
.
code
);

    
oauth2Client
.
setCredentials
(
tokens
);

});
```
### HTTP/REST
To exchange an authorization code for an access token, call the https://oauth2.googleapis.com/token endpoint and set the following parameters:
| Fields |  |
| --- | --- |
| client_id | The client ID obtained from the Cloud Console Clients page . |
| client_secret | Optional The client secret obtained from the Cloud Console Clients page . |
| code | The authorization code returned from the initial request. |
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
redirect_uri=https%3A//developers.google.com/oauthplayground&
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
Google responds to this request by returning a JSON object that contains a short-lived access token and a refresh token. Note that the refresh token is only returned if your application set the access_type parameter to offline in the initial request to Google's authorization server .
The response contains the following fields:
| Fields |  |
| --- | --- |
| access_token | The token that your application sends to authorize a Google API request. |
| expires_in | The remaining lifetime of the access token in seconds. |
| refresh_token | A token that you can use to obtain a new access token. Refresh tokens are valid until the user revokes access or the refresh token expires. If DPoP was used, the refresh token is bound to the private key used to sign the DPoP proof. Again, this field is only present in this response if you set the access_type parameter to offline in the initial request to Google's authorization server. |
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
#### Errors
When exchanging the authorization code for an access token you may encounter the following error instead of the expected response. Common error codes and suggested resolutions are listed in this section.
##### invalid_grant
The supplied authorization code is invalid or in the wrong format. Request a new code by restarting the OAuth process to prompt the user for consent again.
### Step 6: Check which scopes users granted
When requesting multiple permissions (scopes), users may not grant your app access to all of them. Your app must verify which scopes were actually granted and gracefully handle situations where some permissions are denied, typically by disabling the features that rely on those denied scopes.
However, there are exceptions. Google Workspace Enterprise apps with domain-wide delegation of authority , or apps marked as Trusted , bypass the granular permissions consent screen. For these apps, users won't see the granular permission consent screen. Instead, your app will either receive all requested scopes or none.
For more detailed information, see How to handle granular permissions .
### PHP
To check which scopes the user has granted, use the getGrantedScope() method:
```
// Space-separated string of granted scopes if it exists, otherwise null.

$granted_scopes = $client->getOAuth2Service()->getGrantedScope();
```
### Python
The returned credentials object has a granted_scopes property, which is a list of scopes the user has granted to your app.
```
credentials
 
=
 
flow
.
credentials

flask
.
session
[
'credentials'
]
 
=
 
{

    
'token'
:
 
credentials
.
token
,

    
'refresh_token'
:
 
credentials
.
refresh_token
,

    
'granted_scopes'
:
 
credentials
.
granted_scopes
}
```
### Ruby
When requesting multiple scopes at once, check which scopes were granted through the scope property of the credentials object.
```
# User authorized the request. Now, check which scopes were granted.

if
 
credentials
.
scope
.
include?
(
Google
::
Apis
::
YoutubeV3
::
AUTH_YOUTUBE_FORCE_SSL
)

  
# User authorized permission to see, edit, and permanently delete the

  
# YouTube videos, ratings, comments and captions.

  
# Calling the APIs, etc

else

  
# User didn't authorize the permission.

  
# Update UX and application accordingly

end
```
### Node.js
When requesting multiple scopes at once, check which scopes were granted through the scope property of the tokens object.
```
// User authorized the request. Now, check which scopes were granted.

if
 
(
tokens
.
scope
.
includes
(
'https://www.googleapis.com/auth/youtube.force-ssl'
))

{

  
// User authorized permission to see, edit, and permanently delete the

  
// YouTube videos, ratings, comments and captions.

  
// Calling the APIs, etc.

}

else

{

  
// User didn't authorize read-only Drive activity permission.

  
// Update UX and application accordingly

}
```
### HTTP/REST
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
### PHP
Use the access token to call Google APIs by completing the following steps:
1. If you need to apply an access token to a new Google\Client object — for example, if you stored the access token in a user session — use the setAccessToken method: $client->setAccessToken($access_token);
2. Build a service object for the API that you want to call. You build a service object by providing an authorized Google\Client object to the constructor for the API you want to call. For example, to call the YouTube Data API: $youtube = new Google_Service_YouTube($client);
3. Make requests to the API service using the interface provided by the service object . For example, to retrieve data about the authorized user's YouTube channel: $channel = $youtube->channels->listChannels('snippet', array('mine' => $mine));
### Python
After obtaining an access token, your application can use that token to authorize API requests on behalf of a given user account or service account. Use the user-specific authorization credentials to build a service object for the API that you want to call, and then use that object to make authorized API requests.
1. Build a service object for the API that you want to call. You build a service object by calling the googleapiclient.discovery library's build method with the name and version of the API and the user credentials: For example, to call version 3 of the YouTube Data API: from googleapiclient.discovery import build youtube = build ( 'youtube' , 'v3' , credentials = credentials )
2. Make requests to the API service using the interface provided by the service object . For example, to retrieve data about the authorized user's YouTube channel: channel = youtube . channels () . list ( mine = True , part = 'snippet' ) . execute ()
### Ruby
After obtaining an access token, your application can use that token to make API requests on behalf of a given user account or service account. Use the user-specific authorization credentials to build a service object for the API that you want to call, and then use that object to make authorized API requests.
1. Build a service object for the API that you want to call. For example, to call version 3 of the YouTube Data API: youtube = Google :: Apis :: YoutubeV3 :: YouTubeService . new
2. Set the credentials on the service: youtube . authorization = credentials
3. Make requests to the API service using the interface provided by the service object . For example, to retrieve data about the authorized user's YouTube channel: channel = youtube . list_channels ( part , :mine = > mine )
Alternately, authorization can be provided on a per-method basis by supplying the options parameter to a method:
```
channel
 
=
 
youtube
.
list_channels
(
part
,
 
:mine
 
=
>
 
mine
,
 
options
:
 
{
 
authorization
:
 
auth_client
 
})
```
### Node.js
After obtaining an access token and setting it to the OAuth2 object, use the object to call Google APIs. Your application can use that token to authorize API requests on behalf of a given user account or service account. Build a service object for the API that you want to call. For example, the following code uses the Google Drive API to list filenames in the user's Drive.
```
const
 
{
 
google
 
}
 
=
 
require
(
'googleapis'
);

// Example of using YouTube API to list channels.

var
 
service
 
=
 
google
.
youtube
(
'v3'
);

service
.
channels
.
list
({

  
auth
:
 
oauth2Client
,

  
part
:
 
'snippet,contentDetails,statistics'
,

  
forUsername
:
 
'GoogleDevelopers'

},
 
function
 
(
err
,
 
response
)
 
{

  
if
 
(
err
)
 
{

    
console
.
log
(
'The API returned an error: '
 
+
 
err
);

    
return
;

  
}

  
var
 
channels
 
=
 
response
.
data
.
items
;

  
if
 
(
channels
.
length
 
==
 
0
)
 
{

    
console
.
log
(
'No channel found.'
);

  
}
 
else
 
{

    
console
.
log
(
'This channel\'s ID is %s. Its title is \'%s\', and '
 
+

      
'it has %s views.'
,

      
channels
[
0
].
id
,

      
channels
[
0
].
snippet
.
title
,

      
channels
[
0
].
statistics
.
viewCount
);

  
}

});
```
### HTTP/REST
After your application obtains an access token, you can use the token to make calls to a Google API on behalf of a given user account if the scope(s) of access required by the API have been granted. To do this, include the access token in a request to the API by including either an access_token query parameter or an Authorization HTTP header Bearer value. When possible, the HTTP header is preferable, because query strings tend to be visible in server logs. In most cases you can use a client library to set up your calls to Google APIs (for example, when calling the YouTube Data API ).
Note that the YouTube Data API supports service accounts only for YouTube content owners that own and manage multiple YouTube channels, such as record labels and movie studios.
You can try out all the Google APIs and view their scopes at the OAuth 2.0 Playground .
#### HTTP GET examples
A call to the youtube.channels endpoint (the YouTube Data API) using the Authorization: Bearer HTTP header might look like the following. Note that you need to specify your own access token: GET /youtube/v3/channels?part=snippet&mine=true HTTP/1.1 Host: www.googleapis.com Authorization: Bearer access_token Here is a call to the same API for the authenticated user using the access_token query string parameter: GET https://www.googleapis.com/youtube/v3/channels?access_token= access_token &part=snippet&mine=true curl examples You can test these commands with the curl command-line application. Here's an example that uses the HTTP header option (preferred): curl -H "Authorization: Bearer access_token " https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true Or, alternatively, the query string parameter option: curl https://www.googleapis.com/youtube/v3/channels?access_token= access_token &part=snippet&mine=true
## Complete example
The following example prints a JSON-formatted object showing information about a user's YouTube channel after the user authenticates and authorizes the application to manage the user's YouTube account.
### PHP
To run this example:
1. In the API Console, add the URL of the local machine to the list of redirect URLs. For example, add http://localhost:8080 .
2. Create a new directory and change to it. For example: mkdir ~/php-oauth2-example cd ~/php-oauth2-example
3. Install the Google API Client Library for PHP using Composer : composer require google/apiclient:^2.15.0
4. Create the files index.php and oauth2callback.php with the following content.
5. Run the example with the PHP's built-in test web server: php -S localhost:8080 ~/php-oauth2-example
#### index.php
```
<
?php

require_once __DIR__.'/vendor/autoload.php';

session_start();

$client = new Google\Client();

$client->setAuthConfig('client_secret.json');

// User granted permission as an access token is in the session.

if (isset($_SESSION['access_token']) && $_SESSION['access_token'])

{

  $client->setAccessToken($_SESSION['access_token']);

  

  $youtube = new Google_Service_YouTube($client);

  $channel = $youtube->channels->listChannels('snippet', array('mine' => $mine));

  echo json_encode($channel);

  

}

else

{

  // Redirect users to outh2call.php which redirects users to Google OAuth 2.0

  $redirect_uri = 'http://' . $_SERVER['HTTP_HOST'] . '/oauth2callback.php';

  header('Location: ' . filter_var($redirect_uri, FILTER_SANITIZE_URL));

}

?
>
```
#### oauth2callback.php
```
<
?php

require_once __DIR__.'/vendor/autoload.php';

session_start();

$client = new Google\Client();

// Required, call the setAuthConfig function to load authorization credentials from

// client_secret.json file.

$client->setAuthConfigFile('client_secret.json');

$client->setRedirectUri('http://' . $_SERVER['HTTP_HOST']. $_SERVER['PHP_SELF']);

// Required, to set the scope value, call the addScope function.

$client->addScope(GOOGLE_SERVICE_YOUTUBE::YOUTUBE_FORCE_SSL);

// Enable incremental authorization. Recommended as a best practice.

$client->setIncludeGrantedScopes(true);

// Recommended, offline access will give you both an access and refresh token so that

// your app can refresh the access token without user interaction.

$client->setAccessType("offline");

// Generate a URL for authorization as it doesn't contain code and error

if (!isset($_GET['code']) && !isset($_GET['error']))

{

  // Generate and set state value

  $state = bin2hex(random_bytes(16));

  $client->setState($state);

  $_SESSION['state'] = $state;

  // Generate a url that asks permissions.

  $auth_url = $client->createAuthUrl();

  header('Location: ' . filter_var($auth_url, FILTER_SANITIZE_URL));

}

// User authorized the request and authorization code is returned to exchange access and

// refresh tokens.

if (isset($_GET['code']))

{

  // Check the state value

  if (!isset($_GET['state']) || $_GET['state'] !== $_SESSION['state']) {

    die('State mismatch. Possible CSRF attack.');

  }

  // Get access and refresh tokens (if access_type is offline)

  $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);

  /** Save access and refresh token to the session variables.

    * ACTION ITEM: In a production app, you likely want to save the

    *              refresh token in a secure persistent storage instead. */

  $_SESSION['access_token'] = $token;

  $_SESSION['refresh_token'] = $client->getRefreshToken();

  

  $redirect_uri = 'http://' . $_SERVER['HTTP_HOST'] . '/';

  header('Location: ' . filter_var($redirect_uri, FILTER_SANITIZE_URL));

}

// An error response e.g. error=access_denied

if (isset($_GET['error']))

{

  echo "Error: ". $_GET['error'];

}

?
>
```
### Python
This example uses the Flask framework. It runs a web application at http://localhost:8080 that lets you test the OAuth 2.0 flow. If you go to that URL, you should see five links:
- Test an API request: This link points to a page that tries to execute a sample API request. If necessary, it starts the authorization flow. If successful, the page displays the API response.
- Test the auth flow directly: This link points to a page that tries to send the user through the authorization flow . The app requests permission to submit authorized API requests on the user's behalf.
- Revoke current credentials: This link points to a page that revokes permissions that the user has already granted to the application.
- Clear Flask session credentials: This link clears authorization credentials that are stored in the Flask session. This lets you see what would happen if a user who had already granted permission to your app tried to execute an API request in a new session. It also lets you see the API response your app would get if a user had revoked permissions granted to your app, and your app still tried to authorize a request with a revoked access token.
```
# -*- coding: utf-8 -*-

import
 
os

import
 
flask

import
 
json

import
 
requests

import
 
google.oauth2.credentials

import
 
google_auth_oauthlib.flow

import
 
googleapiclient.discovery

# This variable specifies the name of a file that contains the OAuth 2.0

# information for this application, including its client_id and client_secret.

CLIENT_SECRETS_FILE
 
=
 
"client_secret.json"

# The OAuth 2.0 access scope allows for access to the

# authenticated user's account and requires requests to use an SSL connection.

SCOPES
 
=
 
[
'https://www.googleapis.com/auth/youtube.force-ssl'
]

API_SERVICE_NAME
 
=
 
'youtube'

API_VERSION
 
=
 
'v3'

app
 
=
 
flask
.
Flask
(
__name__
)

# Note: A secret key is included in the sample so that it works.

# If you use this code in your application, replace this with a truly secret

# key. See https://flask.palletsprojects.com/quickstart/#sessions.

app
.
secret_key
 
=
 
'REPLACE ME - this value is here as a placeholder.'

@app
.
route
(
'/'
)

def
 
index
():

  
return
 
print_index_table
()

@app
.
route
(
'/test'
)

def
 
test_api_request
():

  
if
 
'credentials'
 
not
 
in
 
flask
.
session
:

  
return
 
flask
.
redirect
(
'authorize'
)

  
# Load credentials from the session.

  
credentials
 
=
 
google
.
oauth2
.
credentials
.
Credentials
(

    
**
flask
.
session
[
'credentials'
])

  
youtube
 
=
 
googleapiclient
.
discovery
.
build
(

    
API_SERVICE_NAME
,
 
API_VERSION
,
 
credentials
=
credentials
)

  
channel
 
=
 
youtube
.
channels
()
.
list
(
mine
=
True
,
 
part
=
'snippet'
)
.
execute
()

  
# Save credentials back to session in case access token was refreshed.

  
# ACTION ITEM: In a production app, you likely want to save these

  
#              credentials in a persistent database instead.

  
flask
.
session
[
'credentials'
]
 
=
 
credentials_to_dict
(
credentials
)

  
return
 
flask
.
jsonify
(
**
channel
)

@app
.
route
(
'/authorize'
)

def
 
authorize
():

  
# Create flow instance to manage the OAuth 2.0 Authorization Grant Flow steps.

  
flow
 
=
 
google_auth_oauthlib
.
flow
.
Flow
.
from_client_secrets_file
(

      
CLIENT_SECRETS_FILE
,
 
scopes
=
SCOPES
)

  
# The URI created here must exactly match one of the authorized redirect URIs

  
# for the OAuth 2.0 client, which you configured in the API Console. If this

  
# value doesn't match an authorized URI, you will get a 'redirect_uri_mismatch'

  
# error.

  
flow
.
redirect_uri
 
=
 
flask
.
url_for
(
'oauth2callback'
,
 
_external
=
True
)

  
authorization_url
,
 
state
 
=
 
flow
.
authorization_url
(

      
# Enable offline access so that you can refresh an access token without

      
# re-prompting the user for permission. Recommended for web server apps.

      
access_type
=
'offline'
,

      
# Enable incremental authorization. Recommended as a best practice.

      
include_granted_scopes
=
'true'
)

  
# Store the state so the callback can verify the auth server response.

  
flask
.
session
[
'state'
]
 
=
 
state

  
return
 
flask
.
redirect
(
authorization_url
)

@app
.
route
(
'/oauth2callback'
)

def
 
oauth2callback
():

  
# Specify the state when creating the flow in the callback so that it can

  
# verified in the authorization server response.

  
state
 
=
 
flask
.
session
[
'state'
]

  
flow
 
=
 
google_auth_oauthlib
.
flow
.
Flow
.
from_client_secrets_file
(

      
CLIENT_SECRETS_FILE
,
 
scopes
=
SCOPES
,
 
state
=
state
)

  
flow
.
redirect_uri
 
=
 
flask
.
url_for
(
'oauth2callback'
,
 
_external
=
True
)

  
# Use the authorization server's response to fetch the OAuth 2.0 tokens.

  
authorization_response
 
=
 
flask
.
request
.
url

  
flow
.
fetch_token
(
authorization_response
=
authorization_response
)

  
# Store credentials in the session.

  
# ACTION ITEM: In a production app, you likely want to save these

  
#              credentials in a persistent database instead.

  
credentials
 
=
 
flow
.
credentials

  
  
flask
.
session
[
'credentials'
]
 
=
 
credentials_to_dict
(
credentials
)

  
return
 
flask
.
redirect
(
flask
.
url_for
(
'test_api_request'
))

  

@app
.
route
(
'/revoke'
)

def
 
revoke
():

  
if
 
'credentials'
 
not
 
in
 
flask
.
session
:

    
return
 
(
'You need to <a href="/authorize">authorize</a> before '
 
+

            
'testing the code to revoke credentials.'
)

  
# Load client secrets from the server-side file.

  
with
 
open
(
CLIENT_SECRETS_FILE
,
 
'r'
)
 
as
 
f
:

      
client_config
 
=
 
json
.
load
(
f
)[
'web'
]

  
# Load user-specific credentials from the session.

  
session_credentials
 
=
 
flask
.
session
[
'credentials'
]

  
# Reconstruct the credentials object.

  
credentials
 
=
 
google
.
oauth2
.
credentials
.
Credentials
(

      
refresh_token
=
session_credentials
.
get
(
'refresh_token'
),

      
scopes
=
session_credentials
.
get
(
'granted_scopes'
),

      
token
=
session_credentials
.
get
(
'token'
),

      
client_id
=
client_config
.
get
(
'client_id'
),

      
client_secret
=
client_config
.
get
(
'client_secret'
),

      
token_uri
=
client_config
.
get
(
'token_uri'
))

  
revoke
 
=
 
requests
.
post
(
'https://oauth2.googleapis.com/revoke'
,

      
params
=
{
'token'
:
 
credentials
.
token
},

      
headers
 
=
 
{
'content-type'
:
 
'application/x-www-form-urlencoded'
})

  
status_code
 
=
 
getattr
(
revoke
,
 
'status_code'
)

  
if
 
status_code
 
==
 
200
:

    
# Clear the user's session credentials after successful revocation

    
if
 
'credentials'
 
in
 
flask
.
session
:

        
del
 
flask
.
session
[
'credentials'
]

        
del
 
flask
.
session
[
'features'
]

    
return
(
'Credentials successfully revoked.'
 
+
 
print_index_table
())

  
else
:

    
return
(
'An error occurred.'
 
+
 
print_index_table
())

@app
.
route
(
'/clear'
)

def
 
clear_credentials
():

  
if
 
'credentials'
 
in
 
flask
.
session
:

    
del
 
flask
.
session
[
'credentials'
]

  
return
 
(
'Credentials have been cleared.<br><br>'
 
+

          
print_index_table
())

def
 
credentials_to_dict
(
credentials
):

  
return
 
{
'token'
:
 
credentials
.
token
,

          
'refresh_token'
:
 
credentials
.
refresh_token
,

          
'granted_scopes'
:
 
credentials
.
granted_scopes
}

def
 
print_index_table
():

  
return
 
(
'<table>'
 
+
 
          
'<tr><td><a href="/test">Test an API request</a></td>'
 
+

          
'<td>Submit an API request and see a formatted JSON response. '
 
+

          
'    Go through the authorization flow if there are no stored '
 
+

          
'    credentials for the user.</td></tr>'
 
+
 
          
'<tr><td><a href="/revoke">Revoke current credentials</a></td>'
 
+

          
'<td>Revoke the access token associated with the current user '
 
+

          
'    session. After revoking credentials, if you go to the test '
 
+

          
'    page, you should see an <code>invalid_grant</code> error.'
 
+

          
'</td></tr>'
 
+

          
'<tr><td><a href="/clear">Clear Flask session credentials</a></td>'
 
+

          
'<td>Clear the access token currently stored in the user session. '
 
+

          
'    After clearing the token, if you <a href="/test">test the '
 
+

          
'    API request</a> '
 
+

          
'    again, you should go back to the auth flow.'
 
+

          
'</td></tr></table>'
)

if
 
__name__
 
==
 
'__main__'
:

  
# When running locally, disable OAuthlib's HTTPs verification.

  
# ACTION ITEM for developers:

  
#     When running in production *do not* leave this option enabled.

  
os
.
environ
[
'OAUTHLIB_INSECURE_TRANSPORT'
]
 
=
 
'1'

  
# This disables the requested scopes and granted scopes check.

  
# If users only grant partial request, the warning would not be thrown.

  
os
.
environ
[
'OAUTHLIB_RELAX_TOKEN_SCOPE'
]
 
=
 
'1'

  
# Specify a hostname and port that are set as a valid redirect URI

  
# for your API project in the Google API Console.

  
app
.
run
(
'localhost'
,
 
8080
,
 
debug
=
True
)
```
### Ruby
This example uses the Sinatra framework.
```
require
 
'googleauth'

require
 
'googleauth/web_user_authorizer'

require
 
'googleauth/stores/redis_token_store'

require
 
'google/apis/youtube_v3'

require
 
'sinatra'

configure
 
do

  
enable
 
:sessions

  
# Required, call the from_file method to retrieve the client ID from a

  
# client_secret.json file.

  
set
 
:client_id
,
 
Google
::
Auth
::
ClientId
.
from_file
(
'/path/to/client_secret.json'
)

  
# Required, scope value

  
# Access scopes for retrieving data about the user's YouTube channel.

  
scope
 
=
 
'Google::Apis::YoutubeV3::AUTH_YOUTUBE_FORCE_SSL'

  
# Required, Authorizers require a storage instance to manage long term persistence of

  
# access and refresh tokens.

  
set
 
:token_store
,
 
Google
::
Auth
::
Stores
::
RedisTokenStore
.
new
(
redis
:
 
Redis
.
new
)

  
# Required, indicate where the API server will redirect the user after the user completes

  
# the authorization flow. The redirect URI is required. The value must exactly

  
# match one of the authorized redirect URIs for the OAuth 2.0 client, which you

  
# configured in the API Console. If this value doesn't match an authorized URI,

  
# you will get a 'redirect_uri_mismatch' error.

  
set
 
:callback_uri
,
 
'/oauth2callback'

  
# To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI

  
# from the client_secret.json file. To get these credentials for your application, visit

  
# https://console.cloud.google.com/apis/credentials.

  
set
 
:authorizer
,
 
Google
::
Auth
::
WebUserAuthorizer
.
new
(
settings
.
client_id
,
 
settings
.
scope
,

                          
settings
.
token_store
,
 
callback_uri
:
 
settings
.
callback_uri
)

end

get
 
'/'
 
do

  
# NOTE: Assumes the user is already authenticated to the app

  
user_id
 
=
 
request
.
session
[
'user_id'
]

  
# Fetch stored credentials for the user from the given request session.

  
# nil if none present

  
credentials
 
=
 
settings
.
authorizer
.
get_credentials
(
user_id
,
 
request
)

  
if
 
credentials
.
nil?

    
# Generate a url that asks the user to authorize requested scope(s).

    
# Then, redirect user to the url.

    
redirect
 
settings
.
authorizer
.
get_authorization_url
(
request
:
 
request
)

  
end

  

  
# User authorized read-only YouTube Data API permission.

  
# Example of using YouTube Data API to list user's YouTube channel

  
youtube
 
=
 
Google
::
Apis
::
YoutubeV3
::
YouTubeService
.
new

  
channel
 
=
 
youtube
.
list_channels
(
part
,
 
:mine
 
=
>
 
mine
,
 
options
:
 
{
 
authorization
:
 
auth_client
 
})

  

  
"<pre>
#{
JSON
.
pretty_generate
(
channel
.
to_h
)
}
<
/pre>"

end

# Receive the callback from Google's OAuth 2.0 server.

get
 
'/oauth2callback'
 
do

  
# Handle the result of the oauth callback. Defers the exchange of the code by

  
# temporarily stashing the results in the user's session.

  
target_url
 
=
 
Google
::
Auth
::
WebUserAuthorizer
.
handle_auth_callback_deferred
(
request
)

  
redirect
 
target_url

end
```
### Node.js
To run this example:
1. In the API Console, add the URL of the local machine to the list of redirect URLs. For example, add http://localhost .
2. Make sure you have maintenance LTS, active LTS, or current release of Node.js installed.
3. Create a new directory and change to it. For example: mkdir ~/nodejs-oauth2-example cd ~/nodejs-oauth2-example
4. Install the Google API Client Library for Node.js using npm : npm install googleapis
5. Create the files main.js with the following content.
6. Run the example: node .\main.js
#### main.js
```
const
 
http
 
=
 
require
(
'http'
);

const
 
https
 
=
 
require
(
'https'
);

const
 
url
 
=
 
require
(
'url'
);

const
 
{
 
google
 
}
 
=
 
require
(
'googleapis'
);

const
 
crypto
 
=
 
require
(
'crypto'
);

const
 
express
 
=
 
require
(
'express'
);

const
 
session
 
=
 
require
(
'express-session'
);

/**

 * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI.

 * To get these credentials for your application, visit

 * https://console.cloud.google.com/apis/credentials.

 */

const
 
oauth2Client
 
=
 
new
 
google
.
auth
.
OAuth2
(

  
YOUR_CLIENT_ID
,

  
YOUR_CLIENT_SECRET
,

  
YOUR_REDIRECT_URL

);

// Access scopes for YouTube API

const
 
scopes
 
=
 
[

  
'https://www.googleapis.com/auth/youtube.force-ssl'

];

/* Global variable that stores user credential in this code example.

 * ACTION ITEM for developers:

 *   Store user's refresh token in your data store if

 *   incorporating this code into your real app.

 *   For more information on handling refresh tokens,

 *   see https://github.com/googleapis/google-api-nodejs-client#handling-refresh-tokens

 */

let
 
userCredential
 
=
 
null
;

async
 
function
 
main
()
 
{

  
const
 
app
 
=
 
express
();

  
app
.
use
(
session
({

    
secret
:
 
'your_secure_secret_key'
,
 
// Replace with a strong secret

    
resave
:
 
false
,

    
saveUninitialized
:
 
false
,

  
}));

  
// Example on redirecting user to Google's OAuth 2.0 server.

  
app
.
get
(
'/'
,
 
async
 
(
req
,
 
res
)
 
=>
 
{

    
// Generate a secure random state value.

    
const
 
state
 
=
 
crypto
.
randomBytes
(
32
).
toString
(
'hex'
);

    
// Store state in the session

    
req
.
session
.
state
 
=
 
state
;

    
// Generate a url that asks permissions for the Drive activity and Google Calendar scope

    
const
 
authorizationUrl
 
=
 
oauth2Client
.
generateAuthUrl
({

      
// 'online' (default) or 'offline' (gets refresh_token)

      
access_type
:
 
'offline'
,

      
/** Pass in the scopes array defined above.

        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */

      
scope
:
 
scopes
,

      
// Enable incremental authorization. Recommended as a best practice.

      
include_granted_scopes
:
 
true
,

      
// Include the state parameter to reduce the risk of CSRF attacks.

      
state
:
 
state

    
});

    
res
.
redirect
(
authorizationUrl
);

  
});

  
// Receive the callback from Google's OAuth 2.0 server.

  
app
.
get
(
'/oauth2callback'
,
 
async
 
(
req
,
 
res
)
 
=>
 
{

    
// Handle the OAuth 2.0 server response

    
let
 
q
 
=
 
url
.
parse
(
req
.
url
,
 
true
).
query
;

    
if
 
(
q
.
error
)
 
{
 
// An error response e.g. error=access_denied

      
console
.
log
(
'Error:'
 
+
 
q
.
error
);

    
}
 
else
 
if
 
(
q
.
state
 
!==
 
req
.
session
.
state
)
 
{
 
//check state value

      
console
.
log
(
'State mismatch. Possible CSRF attack'
);

      
res
.
end
(
'State mismatch. Possible CSRF attack'
);

    
}
 
else
 
{
 
// Get access and refresh tokens (if access_type is offline)

      
let
 
{
 
tokens
 
}
 
=
 
await
 
oauth2Client
.
getToken
(
q
.
code
);

      
oauth2Client
.
setCredentials
(
tokens
);

      
/** Save credential to the global variable in case access token was refreshed.

        * ACTION ITEM: In a production app, you likely want to save the refresh token

        *              in a secure persistent database instead. */

      
userCredential
 
=
 
tokens
;

      

      
// Example of using YouTube API to list channels.

      
var
 
service
 
=
 
google
.
youtube
(
'v3'
);

      
service
.
channels
.
list
({

        
auth
:
 
oauth2Client
,

        
part
:
 
'snippet,contentDetails,statistics'
,

        
forUsername
:
 
'GoogleDevelopers'

      
},
 
function
 
(
err
,
 
response
)
 
{

        
if
 
(
err
)
 
{

          
console
.
log
(
'The API returned an error: '
 
+
 
err
);

          
return
;

        
}

        
var
 
channels
 
=
 
response
.
data
.
items
;

        
if
 
(
channels
.
length
 
==
 
0
)
 
{

          
console
.
log
(
'No channel found.'
);

        
}
 
else
 
{

          
console
.
log
(
'This channel\'s ID is %s. Its title is \'%s\', and '
 
+

            
'it has %s views.'
,

            
channels
[
0
].
id
,

            
channels
[
0
].
snippet
.
title
,

            
channels
[
0
].
statistics
.
viewCount
);

        
}

      
});

    
}

  
});

  
// Example on revoking a token

  
app
.
get
(
'/revoke'
,
 
async
 
(
req
,
 
res
)
 
=>
 
{

    
// Build the string for the POST request

    
let
 
postData
 
=
 
"token="
 
+
 
userCredential
.
access_token
;

    
// Options for POST request to Google's OAuth 2.0 server to revoke a token

    
let
 
postOptions
 
=
 
{

      
host
:
 
'oauth2.googleapis.com'
,

      
port
:
 
'443'
,

      
path
:
 
'/revoke'
,

      
method
:
 
'POST'
,

      
headers
:
 
{

        
'Content-Type'
:
 
'application/x-www-form-urlencoded'
,

        
'Content-Length'
:
 
Buffer
.
byteLength
(
postData
)

      
}

    
};

    
// Set up the request

    
const
 
postReq
 
=
 
https
.
request
(
postOptions
,
 
function
 
(
res
)
 
{

      
res
.
setEncoding
(
'utf8'
);

      
res
.
on
(
'data'
,
 
d
 
=>
 
{

        
console
.
log
(
'Response: '
 
+
 
d
);

      
});

    
});

    
postReq
.
on
(
'error'
,
 
error
 
=>
 
{

      
console
.
log
(
error
)

    
});

    
// Post the request with data

    
postReq
.
write
(
postData
);

    
postReq
.
end
();

  
});

  
const
 
server
 
=
 
http
.
createServer
(
app
);

  
server
.
listen
(
8080
);

}

main
().
catch
(
console
.
error
);
```
### HTTP/REST
This Python example uses the Flask framework and the Requests library to demonstrate the OAuth 2.0 web flow. We recommend using the Google API Client Library for Python for this flow. (The example in the Python tab does use the client library.)
```
import
 
json

import
 
flask

import
 
requests

app
 
=
 
flask
.
Flask
(
__name__
)

# To get these credentials (CLIENT_ID CLIENT_SECRET) and for your application, visit

# https://console.cloud.google.com/apis/credentials.

CLIENT_ID
 
=
 
'123456789.apps.googleusercontent.com'

CLIENT_SECRET
 
=
 
'abc123'
  
# Read from a file or environmental variable in a real app

# Access scopes for YouTube API

SCOPE
 
=
 
'https://www.googleapis.com/auth/youtube.force-ssl'

# Indicate where the API server will redirect the user after the user completes

# the authorization flow. The redirect URI is required. The value must exactly

# match one of the authorized redirect URIs for the OAuth 2.0 client, which you

# configured in the API Console. If this value doesn't match an authorized URI,

# you will get a 'redirect_uri_mismatch' error.

REDIRECT_URI
 
=
 
'http://example.com/oauth2callback'

@app
.
route
(
'/'
)

def
 
index
():

  
if
 
'credentials'
 
not
 
in
 
flask
.
session
:

    
return
 
flask
.
redirect
(
flask
.
url_for
(
'oauth2callback'
))

  
credentials
 
=
 
json
.
loads
(
flask
.
session
[
'credentials'
])

  
if
 
credentials
[
'expires_in'
]
 <
=
 
0
:

    
return
 
flask
.
redirect
(
flask
.
url_for
(
'oauth2callback'
))

  
else
:
 
    
headers
 
=
 
{
'Authorization'
:
 
'Bearer 
{}
'
.
format
(
credentials
[
'access_token'
])}

    
req_uri
 
=
 
'https://www.googleapis.com/youtube/v3/channels/list'

    
r
 
=
 
requests
.
get
(
req_uri
,
 
headers
=
headers
)

    
return
 
r
.
text
 

@app
.
route
(
'/oauth2callback'
)

def
 
oauth2callback
():

  
if
 
'code'
 
not
 
in
 
flask
.
request
.
args
:

    
state
 
=
 
str
(
uuid
.
uuid4
())

    
flask
.
session
[
'state'
]
 
=
 
state

    
# Generate a url that asks permissions for the Drive activity

    
# and Google Calendar scope. Then, redirect user to the url.

    
auth_uri
 
=
 
(
'https://accounts.google.com/o/oauth2/v2/auth?response_type=code'

                
'&client_id=
{}
&redirect_uri=
{}
&scope=
{}
&state=
{}
'
)
.
format
(
CLIENT_ID
,
 
REDIRECT_URI
,

                                                                          
SCOPE
,
 
state
)

    
return
 
flask
.
redirect
(
auth_uri
)

  
else
:

    
if
 
'state'
 
not
 
in
 
flask
.
request
.
args
 
or
 
flask
.
request
.
args
[
'state'
]
 
!=
 
flask
.
session
[
'state'
]:

      
return
 
'State mismatch. Possible CSRF attack.'
,
 
400

    
auth_code
 
=
 
flask
.
request
.
args
.
get
(
'code'
)

    
data
 
=
 
{
'code'
:
 
auth_code
,

            
'client_id'
:
 
CLIENT_ID
,

            
'client_secret'
:
 
CLIENT_SECRET
,

            
'redirect_uri'
:
 
REDIRECT_URI
,

            
'grant_type'
:
 
'authorization_code'
}

    
# Exchange authorization code for access and refresh tokens (if access_type is offline)

    
r
 
=
 
requests
.
post
(
'https://oauth2.googleapis.com/token'
,
 
data
=
data
)

    
flask
.
session
[
'credentials'
]
 
=
 
r
.
text

    
return
 
flask
.
redirect
(
flask
.
url_for
(
'index'
))

if
 
__name__
 
==
 
'__main__'
:

  
import
 
uuid

  
app
.
secret_key
 
=
 
str
(
uuid
.
uuid4
())

  
app
.
debug
 
=
 
False

  
app
.
run
()
```
## Redirect URI validation rules
Google applies the following validation rules to redirect URIs in order to help developers keep their applications secure. Your redirect URIs must adhere to these rules. See RFC 3986 section 3 for the definition of domain, host, path, query, scheme and userinfo, used in these rules.
| Validation rules |  |
| --- | --- |
| Scheme | Redirect URIs must use the HTTPS scheme, not plain HTTP. Localhost URIs (including localhost IP address URIs) are exempt from this rule. |
| Host | Hosts cannot be raw IP addresses. Localhost IP addresses are exempted from this rule. |
| Domain | Host TLDs ( Top Level Domains ) must belong to the public suffix list . Host domains cannot be “googleusercontent.com” . Redirect URIs cannot contain URL shortener domains (e.g. goo.gl ) unless the app owns the domain. Furthermore, if an app that owns a shortener domain chooses to redirect to that domain, that redirect URI must either contain “/google-callback/” in its path or end with “/google-callback” . |
| Userinfo | Redirect URIs cannot contain the userinfo subcomponent. |
| Path | Redirect URIs cannot contain a path traversal (also called directory backtracking), which is represented by an “/..” or “\..” or their URL encoding. |
| Query | Redirect URIs cannot contain open redirects . |
| Fragment | Redirect URIs cannot contain the fragment component. |
| Characters | Redirect URIs cannot contain certain characters including: Wildcard characters ( '*' ) Non-printable ASCII characters Invalid percent encodings (any percent encoding that does not follow URL-encoding form of a percent sign followed by two hexadecimal digits) Null characters (an encoded NULL character, e.g., %00 , %C0%80 ) |
## Incremental authorization
In the OAuth 2.0 protocol, your app requests authorization to access resources, which are identified by scopes. It is considered a best user-experience practice to request authorization for resources at the time you need them. To enable that practice, Google's authorization server supports incremental authorization. This feature lets you request scopes as they are needed and, if the user grants permission for the new scope, returns an authorization code that may be exchanged for a token containing all scopes the user has granted the project.
For example, suppose an app helps users identify interesting local events. The app lets users view videos about the events, rate the videos, and add the videos to playlists. Users can also use the app to add events to their Google Calendars.
In this case, at sign-in time, the app might not need or request access to any scopes. However, if the user tried to rate a video, add a video to a playlist, or perform another YouTube action, the app could request access to the https://www.googleapis.com/auth/youtube.force-ssl scope. Similarly, the app could request access to the https://www.googleapis.com/auth/calendar scope if the user tried to add a calendar event.
To implement incremental authorization, you complete the normal flow for requesting an access token but make sure that the authorization request includes previously granted scopes. This approach allows your app to avoid having to manage multiple access tokens.
The following rules apply to an access token obtained from an incremental authorization:
- The token can be used to access resources corresponding to any of the scopes rolled into the new, combined authorization.
- When you use the refresh token for the combined authorization to obtain an access token, the access token represents the combined authorization and can be used for any of the scope values included in the response.
- The combined authorization includes all scopes that the user granted to the API project even if the grants were requested from different clients. For example, if a user granted access to one scope using an application's desktop client and then granted another scope to the same application via a mobile client, the combined authorization would include both scopes.
- If you revoke a token that represents a combined authorization, access to all of that authorization's scopes on behalf of the associated user are revoked simultaneously.
The language-specific code samples in Step 1: Set authorization Redirect to Google's OAuth 2.0 server all use incremental authorization. The following code samples also show the code that you need to add to use incremental authorization.
### PHP
```
$client->setIncludeGrantedScopes(true);
```
### Python
In Python, set the include_granted_scopes keyword argument to true to ensure that an authorization request includes previously granted scopes. It is very possible that include_granted_scopes will not be the only keyword argument that you set, as shown in the example below.
```
authorization_url
,
 
state
 
=
 
flow
.
authorization_url
(

    
# Enable offline access so that you can refresh an access token without

    
# re-prompting the user for permission. Recommended for web server apps.

    
access_type
=
'offline'
,

    
# Enable incremental authorization. Recommended as a best practice.

    
include_granted_scopes
=
'true'
)
```
### Ruby
```
auth_client
.
update!
(

  
:additional_parameters
 
=>
 
{
"include_granted_scopes"
 
=>
 
"true"
}

)
```
### Node.js
```
const
 
authorizationUrl
 
=
 
oauth2Client
.
generateAuthUrl
({

  
// 'online' (default) or 'offline' (gets refresh_token)

  
access_type
:
 
'offline'
,

  
/** Pass in the scopes array defined above.

    * Alternatively, if only one scope is needed, you can pass a scope URL as a string */

  
scope
:
 
scopes
,

  
// Enable incremental authorization. Recommended as a best practice.

  
include_granted_scopes
:
 
true

});
```
### HTTP/REST
In this example, the calling application requests access to retrieve the user's YouTube Analytics data in addition to any other access that the user has already granted to the application.
```
GET https://accounts.google.com/o/oauth2/v2/auth?
  scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyt-analytics.readonly&
  access_type=offline&
  state=security_token%3D138rk%3Btarget_url%3Dhttp...index&
  redirect_uri=http%3A%2F%2Flocalhost%2Foauth2callback&
  response_type=code&
  client_id=
client_id
&
  
include_granted_scopes=true
```
## Refresh an access token (offline access)
Access tokens periodically expire and become invalid credentials for a related API request. You can refresh an access token without prompting the user for permission (including when the user is not present) if you requested offline access to the scopes associated with the token.
- If you use a Google API Client Library, the client object refreshes the access token as needed as long as you configure that object for offline access.
- If you are not using a client library, you need to set the access_type HTTP query parameter to offline when redirecting the user to Google's OAuth 2.0 server . In that case, Google's authorization server returns a refresh token when you exchange an authorization code for an access token. Then, if the access token expires (or at any other time), you can use a refresh token to obtain a new access token.
Requesting offline access is a requirement for any application that needs to access a Google API when the user is not present. For example, an app that performs backup services or executes actions at predetermined times needs to be able to refresh its access token when the user is not present. The default style of access is called online .
Server-side web applications, installed applications, and devices all obtain refresh tokens during the authorization process. Refresh tokens are not typically used in client-side (JavaScript) web applications.
### PHP
If your application needs offline access to a Google API, set the API client's access type to offline :
```
$client->setAccessType("offline");
```
After a user grants offline access to the requested scopes, you can continue to use the API client to access Google APIs on the user's behalf when the user is offline. The client object will refresh the access token as needed.
### Python
In Python, set the access_type keyword argument to offline to ensure that you will be able to refresh the access token without having to re-prompt the user for permission. It is very possible that access_type will not be the only keyword argument that you set, as shown in the example below.
```
authorization_url
,
 
state
 
=
 
flow
.
authorization_url
(

    
# Enable offline access so that you can refresh an access token without

    
# re-prompting the user for permission. Recommended for web server apps.

    
access_type
=
'offline'
,

    
# Enable incremental authorization. Recommended as a best practice.

    
include_granted_scopes
=
'true'
)
```
After a user grants offline access to the requested scopes, you can continue to use the API client to access Google APIs on the user's behalf when the user is offline. The client object will refresh the access token as needed.
### Ruby
If your application needs offline access to a Google API, set the API client's access type to offline :
```
auth_client
.
update!
(

  
:additional_parameters
 
=>
 
{
"access_type"
 
=>
 
"offline"
}

)
```
After a user grants offline access to the requested scopes, you can continue to use the API client to access Google APIs on the user's behalf when the user is offline. The client object will refresh the access token as needed.
### Node.js
If your application needs offline access to a Google API, set the API client's access type to offline :
```
const
 
authorizationUrl
 
=
 
oauth2Client
.
generateAuthUrl
({

  
// 'online' (default) or 'offline' (gets refresh_token)

  
access_type
:
 
'offline'
,

  
/** Pass in the scopes array defined above.

    * Alternatively, if only one scope is needed, you can pass a scope URL as a string */

  
scope
:
 
scopes
,

  
// Enable incremental authorization. Recommended as a best practice.

  
include_granted_scopes
:
 
true

});
```
After a user grants offline access to the requested scopes, you can continue to use the API client to access Google APIs on the user's behalf when the user is offline. The client object will refresh the access token as needed.
Access tokens expire. This library will automatically use a refresh token to obtain a new access token if it is about to expire. An easy way to make sure you always store the most recent tokens is to use the tokens event:
```
oauth2Client
.
on
(
'tokens'
,
 
(
tokens
)
 
=>
 
{

  
if
 
(
tokens
.
refresh_token
)
 
{

    
// store the refresh_token in your secure persistent database

    
console
.
log
(
tokens
.
refresh_token
);

  
}

  
console
.
log
(
tokens
.
access_token
);

});
```
This tokens event only occurs in the first authorization, and you need to have set your access_type to offline when calling the generateAuthUrl method to receive the refresh token. If you have already given your app the requisiste permissions without setting the appropriate constraints for receiving a refresh token, you will need to re-authorize the application to receive a fresh refresh token.
To set the refresh_token at a later time, you can use the setCredentials method:
```
oauth2Client
.
setCredentials
({

  
refresh_token
:
 
`STORED_REFRESH_TOKEN`

});
```
Once the client has a refresh token, access tokens will be acquired and refreshed automatically in the next call to the API.
### HTTP/REST
To refresh an access token, your application sends an HTTPS POST request to Google's authorization server ( https://oauth2.googleapis.com/token ) that includes the following parameters in the request body:
| Name | Value |
| --- | --- |
| client_id | The client ID obtained from the API Console . |
| client_secret | Optional The client secret obtained from the API Console . |
| grant_type | As defined in the OAuth 2.0 specification , this field's value must be set to refresh_token . |
| refresh_token | The refresh token returned from the authorization code exchange. |
While the use of DPoP is optional, it is recommended for increased security. To use DPoP with a refresh token, your application must generate a new, unique DPoP proof JWT for each request to the token endpoint. This proof must be signed with the same private key that was used during the initial authorization code exchange. Your application adds the proof as a HTTP request header.
| Header | Required | Description |
| --- | --- | --- |
| DPoP | Optional | A DPoP proof is a JWT that proves the possession of a private key. This is a header, not a parameter. If provided, the returned tokens are bound to this key. A new, unique proof must be generated for each request and must include htm (HTTP method) and htu (HTTP URI) claims that match the request. |
The following snippet shows a sample request:
```
POST /token HTTP/1.1
Host: oauth2.googleapis.com
Content-Type: application/x-www-form-urlencoded
DPoP: 
DPOP_PROOF_JWT

client_id=
your_client_id
&
refresh_token=
refresh_token
&
grant_type=refresh_token
```
To use DPoP with a refresh token, you must generate a new, unique DPoP proof JWT for the request. See Construct a DPoP proof for step-by-step instructions on generating the key pair and constructing the JWT.
A successful exchange is indicated by a 200 OK response containing a new access token. When DPoP is used, the token_type is Bearer . A successful response confirms the DPoP proof for the refresh token was accepted. Google may also return a new DPoP-Nonce HTTP header in the response; if returned, your client must cache this nonce and include it in the nonce claim of the DPoP proof in subsequent requests.
A failed exchange occurs if the DPoP header is missing, invalid, or uses an incorrect key. For details on specific DPoP error codes and handling nonces, see Failed exchange .
The following snippet shows a sample successful response headers and body when DPoP is used:
```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
DPoP-Nonce: AN3XwJjZsjnb0ZuWkRlek8QU7wY-Zhf-5IP6tO0tORz0KgtDT1Bo8FX-w4nz3r5lnepI

{
  "access_token": "1/fFAGRNJru1FTz70BzhT3Zg",
  "expires_in": 3920,
  "scope": "https://www.googleapis.com/auth/drive.metadata.readonly",
  "token_type": "Bearer"
}
```
Note that there are limits on the number of refresh tokens that will be issued; one limit per client/user combination, and another per user across all clients. You should save refresh tokens in long-term storage and continue to use them as long as they remain valid. If your application requests too many refresh tokens, it may run into these limits, in which case older refresh tokens will stop working.
## Token revocation
In some cases a user may wish to revoke access given to an application. A user can revoke access by visiting Account Settings . See the Remove site or app access section of the Third-party sites & apps with access to your account support document for more information.
It is also possible for an application to programmatically revoke the access given to it. Programmatic revocation is important in instances where a user unsubscribes, removes an application, or the API resources required by an app have significantly changed. In other words, part of the removal process can include an API request to ensure the permissions previously granted to the application are removed.
### PHP
To programmatically revoke a token, call revokeToken() :
```
$client->revokeToken();
```
### Python
To programmatically revoke a token, make a request to https://oauth2.googleapis.com/revoke that includes the token as a parameter and sets the Content-Type header:
```
requests
.
post
(
'https://oauth2.googleapis.com/revoke'
,

    
params
=
{
'token'
:
 
credentials
.
token
},

    
headers
 
=
 
{
'content-type'
:
 
'application/x-www-form-urlencoded'
})
```
### Ruby
To programmatically revoke a token, make an HTTP request to the oauth2.revoke endpoint:
```
uri
 
=
 
URI
(
'https://oauth2.googleapis.com/revoke'
)

response
 
=
 
Net
::
HTTP
.
post_form
(
uri
,
 
'token'
 
=>
 
auth_client
.
access_token
)
```
The token can be an access token or a refresh token. If the token is an access token and it has a corresponding refresh token, the refresh token will also be revoked.
If the revocation is successfully processed, then the status code of the response is 200 . For error conditions, a status code 400 is returned along with an error code.
### Node.js
To programmatically revoke a token, make an HTTPS POST request to /revoke endpoint:
```
const
 
https
 
=
 
require
(
'https'
);

// Build the string for the POST request

let
 
postData
 
=
 
"token="
 
+
 
userCredential
.
access_token
;

// Options for POST request to Google's OAuth 2.0 server to revoke a token

let
 
postOptions
 
=
 
{

  
host
:
 
'oauth2.googleapis.com'
,

  
port
:
 
'443'
,

  
path
:
 
'/revoke'
,

  
method
:
 
'POST'
,

  
headers
:
 
{

    
'Content-Type'
:
 
'application/x-www-form-urlencoded'
,

    
'Content-Length'
:
 
Buffer
.
byteLength
(
postData
)

  
}

};

// Set up the request

const
 
postReq
 
=
 
https
.
request
(
postOptions
,
 
function
 
(
res
)
 
{

  
res
.
setEncoding
(
'utf8'
);

  
res
.
on
(
'data'
,
 
d
 
=>
 
{

    
console
.
log
(
'Response: '
 
+
 
d
);

  
});

});

postReq
.
on
(
'error'
,
 
error
 
=>
 
{

  
console
.
log
(
error
)

});

// Post the request with data

postReq
.
write
(
postData
);

postReq
.
end
();
```
The token parameter can be an access token or a refresh token. If the token is an access token and it has a corresponding refresh token, the refresh token will also be revoked.
If the revocation is successfully processed, then the status code of the response is 200 . For error conditions, a status code 400 is returned along with an error code.
### HTTP/REST
To programmatically revoke a token, your application makes a request to https://oauth2.googleapis.com/revoke and includes the token as a parameter:
```
curl -d -X -POST --header "Content-type:application/x-www-form-urlencoded" \
        https://oauth2.googleapis.com/revoke?token=
{token}
```
The token can be an access token or a refresh token. If the token is an access token and it has a corresponding refresh token, the refresh token will also be revoked.
If the revocation is successfully processed, then the HTTP status code of the response is 200 . For error conditions, an HTTP status code 400 is returned along with an error code.
## Time-based access
Time-based access allows a user to grant your app access to their data for a limited duration to complete an action. Time-based access is available in select Google products during the consent flow, giving users the option to grant access for a limited period of time. An example is the Data Portability API which enables a one-time transfer of data.
When a user grants your application time-based access, the refresh token will expire after the specified duration. Note that refresh tokens may be invalidated earlier under specific circumstances; see these cases for details. The refresh_token_expires_in field returned in the authorization code exchange response represents the time remaining until the refresh token expires in such cases.
## Implement Cross-Account Protection
An additional step you should take to protect your users' accounts is implementing Cross-Account Protection by utilizing Google's Cross-Account Protection Service. This service lets you subscribe to security event notifications which provide information to your application about major changes to the user account. You can then use the information to take action depending on how you decide to respond to events.
Some examples of the event types sent to your app by Google's Cross-Account Protection Service are:
- https://schemas.openid.net/secevent/risc/event-type/sessions-revoked
- https://schemas.openid.net/secevent/oauth/event-type/token-revoked
- https://schemas.openid.net/secevent/risc/event-type/account-disabled
See the Protect user accounts with Cross-Account Protection page for more information on how to implement Cross Account Protection and for the full list of available events.