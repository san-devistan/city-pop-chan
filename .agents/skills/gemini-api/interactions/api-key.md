- On this page
- API Keys
- Google Cloud projects Default project
- Import projects
- Limitations
- Setting the API key as an environment variable
- Providing the API key explicitly
- Keep your API key secure Critical security rules Best practices
- Troubleshooting API key creation
# Using Gemini API keys
To use the Gemini API, you need an API key. This page outlines how to create and manage your keys in Google AI Studio as well as how to set up your environment to use them in your code.
Create or view a Gemini API Key
## API Keys
You can create and manage all your Gemini API Keys from the Google AI Studio API Keys page.
Once you have an API key, you have the following options to connect to the Gemini API:
- Setting your API key as an environment variable
- Providing your API key explicitly
For initial testing, you can hard code an API key, but this should only be temporary since it's not secure. You can find examples for hard coding the API key in Providing API key explicitly section.
## Google Cloud projects
Google Cloud projects are fundamental to using Google Cloud services (such as the Gemini API), managing billing, and controlling collaborators and permissions. Google AI Studio provides a lightweight interface to your Google Cloud projects.
If you don't have any projects created yet, you must either create a new project or import one from Google Cloud into Google AI Studio. The Projects page in Google AI Studio will display all keys that have sufficient permission to use the Gemini API. Refer to the import projects section for instructions.
### Default project
For new users, after accepting Terms of Service, Google AI Studio creates a default Google Cloud Project and API Key, for ease of use. You can rename this project in Google AI Studio by navigating to Projects view in the Dashboard , clicking the 3 dots settings button next to a project and choosing Rename project . Existing users, or users who already have Google Cloud Accounts won't have a default project created.
## Import projects
Each Gemini API key is associated with a Google Cloud project. By default, Google AI Studio does not show all of your Cloud Projects. You must import the projects you want by searching for the name or project ID in the Import Projects dialog. To view a complete list of projects you have access to, visit the Cloud Console.
If you don't have any projects imported yet, follow these steps to import a Google Cloud project and create a key:
1. Go to Google AI Studio .
2. Open the Dashboard from the left side panel.
3. Select Projects .
4. Select the Import projects button in the Projects page.
5. Search for and select the Google Cloud project you want to import and select the Import button.
Once a project is imported, go to the API Keys page from the Dashboard menu and create an API key in the project you just imported.
## Limitations
The following are limitations of managing API keys and Google Cloud projects in Google AI Studio.
- You can create a maximum of 10 project at a time from the Google AI Studio Projects page.
- You can name and rename projects and keys.
- The API keys and Projects pages display a maximum of 100 keys and 50 projects.
- Only API keys that have no restrictions, or are restricted to the Generative Language API are displayed.
For additional management access to your projects, including modifying and restricting API keys, visit the Google Cloud Console credentials page . In the Cloud Console, you can select your project, click an existing API key, and then restrict it to the Generative Language API .
## Setting the API key as an environment variable
If you set the environment variable GEMINI_API_KEY or GOOGLE_API_KEY , the API key will automatically be picked up by the client when using one of the Gemini API libraries . It's recommended that you set only one of those variables, but if both are set, GOOGLE_API_KEY takes precedence.
If you're using the REST API, or JavaScript on the browser, you will need to provide the API key explicitly.
Here is how you can set your API key locally as the environment variable GEMINI_API_KEY with different operating systems.
Bash is a common Linux and macOS terminal configuration. You can check if you have a configuration file for it by running the following command:
```
~/.bashrc
```
If the response is "No such file or directory", you will need to create this file and open it by running the following commands, or use zsh :
```
touch
 
~/.bashrc

open
 
~/.bashrc
```
Next, you need to set your API key by adding the following export command:
```
export
 
GEMINI_API_KEY
=
<YOUR_API_KEY_HERE>
```
After saving the file, apply the changes by running:
```
source
 
~/.bashrc
```
Zsh is a common Linux and macOS terminal configuration. You can check if you have a configuration file for it by running the following command:
```
~/.zshrc
```
If the response is "No such file or directory", you will need to create this file and open it by running the following commands, or use bash :
```
touch
 
~/.zshrc

open
 
~/.zshrc
```
Next, you need to set your API key by adding the following export command:
```
export
 
GEMINI_API_KEY
=
<YOUR_API_KEY_HERE>
```
After saving the file, apply the changes by running:
```
source
 
~/.zshrc
```
1. Search for "Environment Variables" in the search bar.
2. Choose to modify System Settings . You may have to confirm you want to do this.
3. In the system settings dialog, click the button labeled Environment Variables .
4. Under either User variables (for the current user) or System variables (applies to all users who use the machine), click New...
5. Specify the variable name as GEMINI_API_KEY . Specify your Gemini API Key as the variable value.
6. Click OK to apply the changes.
7. Open a new terminal session (cmd or Powershell) to get the new variable.
## Providing the API key explicitly
In some cases, you may want to explicitly provide an API key. For example:
- You're doing a simple API call and prefer hard coding the API key.
- You want explicit control without having to rely on automatic discovery of environment variables by the Gemini API libraries
- You're using an environment where environment variables are not supported (e.g web) or you are making REST calls.
Below are examples for how you can provide an API key explicitly using the Interactions API:
```
from
 
google
 
import
 
genai

client
 
=
 
genai
.
Client
(
api_key
=
"
YOUR_API_KEY
"
)

interaction
 
=
 
client
.
interactions
.
create
(

    
model
=
"gemini-3.5-flash"
,

    
input
=
"Explain how AI works in a few words"

)

print
(
interaction
.
output_text
)
```
```
import
 
{
 
GoogleGenAI
 
}
 
from
 
"@google/genai"
;

const
 
ai
 
=
 
new
 
GoogleGenAI
({
 
apiKey
:
 
"
YOUR_API_KEY
"
 
});

async
 
function
 
main
()
 
{

  
const
 
interaction
 
=
 
await
 
ai
.
interactions
.
create
({

    
model
:
 
"gemini-3.5-flash"
,

    
input
:
 
"Explain how AI works in a few words"
,

  
});

  
console
.
log
(
interaction
.
output_text
);

}

main
();
```
```
curl
 
"https://generativelanguage.googleapis.com/v1beta/interactions"
 
\

  
-H
 
'Content-Type: application/json'
 
\

  
-H
 
"x-goog-api-key: 
YOUR_API_KEY
"
 
\

  
-H
 
"Api-Revision: 2026-05-20"
 
\

  
-X
 
POST
 
\

  
-d
 
'{

    "model": "gemini-3.5-flash",

    "input": "Explain how AI works in a few words"

  }'
```
## Keep your API key secure
Treat your Gemini API key like a password. If compromised, others can use your project's quota, incur charges (if billing is enabled), and access your private data, such as files.
### Critical security rules
- Keep keys confidential : API keys for Gemini may access sensitive data your application depends upon. Never commit API keys to source control. Do not check your API key into version control systems like Git. Never expose API keys on the client-side. Do not use your API key directly in web or mobile apps in production. Keys in client-side code (including our JavaScript/TypeScript libraries and REST calls) can be extracted.
- Restrict access : Restrict API key usage to specific IP addresses, HTTP referrers, or Android/iOS apps where possible.
- Restrict usage : Enable only the necessary APIs for each key.
- Perform regular audits : Regularly audit your API keys and rotate them periodically.
### Best practices
- Use server-side calls with API keys The most secure way to use your API key is to call the Gemini API from a server-side application where the key can be kept confidential.
- Use ephemeral tokens for client-side access (Live API only): For direct client-side access to the Live API, you can use ephemeral tokens. They come with lower security risks and can be suitable for production use. Review ephemeral tokens guide for more information.
- Consider adding restrictions to your key: You can limit a key's permissions by adding API key restrictions . This minimizes the potential damage if the key is ever leaked.
For some general best practices, you can also review this support article .
## Troubleshooting API key creation
In Google AI Studio, the Create API key button may appear unavailable, with the message: " You do not have permission to create a key in this project ".
This occurs when you lack the necessary permissions within the project to generate a new key:
- resourcemanager.projects.get : Allows AI Studio to verify the project's existence.
- apikeys.keys.create : Allows for the generation of the API key itself.
- serviceusage.services.enable : Required to ensure the Gemini API is active on the project.
- iam.serviceAccounts.create : Every new API key now requires a linked service account , generated at API key creation.
- iam.serviceAccountApiKeyBindings.create : Required to bind the newly created service account to the API key.
To fix your permissions, ask your project admin, or your organization's admin if the project belongs to an organization , to grant you a role with the permissions listed above (such as Project Editor or a custom role).
If you do not have administrative access to a project, you can create a new project that is not associated with an organization to generate your keys.
For a complete list of IAM permissions required for all Google AI Studio features (such as viewing usage, rate limits, or billing), see the AI Studio troubleshooting guide .