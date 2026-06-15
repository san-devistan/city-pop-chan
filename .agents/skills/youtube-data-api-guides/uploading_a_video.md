# Upload a Video Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- This guide demonstrates a Python script for uploading videos to YouTube using the YouTube Data API, which utilizes the Google APIs Client Library for Python.
- The script requires Python 2.5 or higher, the Google APIs Client Library for Python, and registration of your application with Google to use OAuth 2.0 for authorized access.
- A client_secrets.json file is necessary, containing OAuth 2.0 credentials obtained from the Google API Console, to enable the script's authentication.
- The script allows setting video metadata like title, description, keywords, category, and privacy status via command-line arguments.
- The provided Python script includes an exponential backoff strategy for retrying uploads in case of network interruptions or errors.
This guide provides and explains a Python script that uploads a YouTube video using the YouTube Data API. The code uses the Google APIs Client Library for Python. (Client libraries for other popular programming languages are also available.)
Note: The sample script does not do error handling.
## Requirements
- Python 2.5 or higher
- Install the Google APIs Client Library for Python ( google-api-python-client )
- Register your application with Google so that it can use the OAuth 2.0 protocol to authorize access to user data.
- To use OAuth 2.0 steps with this script, you'll need to create a client_secrets.json file that contains information from the API Console . The file should be in the same directory as the script. { "web" : { "client_id" : " [[INSERT CLIENT ID HERE]] " , "client_secret" : " [[INSERT CLIENT SECRET HERE]] " , "redirect_uris" : [], "auth_uri" : "https://accounts.google.com/o/oauth2/auth" , "token_uri" : "https://accounts.google.com/o/oauth2/token" } }
## Sample request
This request uploads a video and sets various metadata fields for the video, including its title, description, keywords, and category. The command-line arguments are all defined in detail in the following section.
```
python upload_video.py --file="/tmp/test_video_file.flv"
                       --title="Summer vacation in California"
                       --description="Had fun surfing in Santa Cruz"
                       --keywords="surfing,Santa Cruz"
                       --category="22"
                       --privacyStatus="private"
```
In this example, the script would build and insert the following video resource for the video:
```
{
  "snippet": {
    "title": "Summer vacation in California",
    "description": "Had fun surfing in Santa Cruz",
    "tags": ["surfing", "Santa Cruz"],
    "categoryId": "22"
  },
  "status": {
    "privacyStatus": "private"
  }
}
```
## Call the script
The list below defines the script's command-line arguments:
- file : This argument identifies the location of the video file that you are uploading. Example: --file="/home/path/to/file.mov"
- title : The title of the video that you are uploading. The default value is Test title . Example: --title="Summer vacation in California"
- description : The description of the video that you're uploading. The default value is Test description . Example: --description="Had fun surfing in Santa Cruz"
- category : The category ID for the YouTube video category associated with the video. The default value is 22 , which refers to the People & Blogs category. Example: --category="22"
- keywords : A comma-separated list of keywords associated with the video. The default value is an empty string. Example: --keywords="surfing"
- privacyStatus : The privacy status of the video. The default behavior is for an uploaded video to be publicly visible ( public ). When uploading test videos, you may want to specify a --privacyStatus argument value to ensure that those videos are private or unlisted. Valid values are public , private , and unlisted . Example: --privacyStatus="private"
## Sample code
The complete working sample for the upload_video.py script is listed below:
```
#!/usr/bin/python

import
 
httplib

import
 
httplib2

import
 
os

import
 
random

import
 
sys

import
 
time

from
 
apiclient.discovery
 
import
 
build

from
 
apiclient.errors
 
import
 
HttpError

from
 
apiclient.http
 
import
 
MediaFileUpload

from
 
oauth2client.client
 
import
 
flow_from_clientsecrets

from
 
oauth2client.file
 
import
 
Storage

from
 
oauth2client.tools
 
import
 
argparser
,
 
run_flow

# Explicitly tell the underlying HTTP transport library not to retry, since

# we are handling retry logic ourselves.

httplib2
.
RETRIES
 
=
 
1

# Maximum number of times to retry before giving up.

MAX_RETRIES
 
=
 
10

# Always retry when these exceptions are raised.

RETRIABLE_EXCEPTIONS
 
=
 
(
httplib2
.
HttpLib2Error
,
 
IOError
,
 
httplib
.
NotConnected
,

  
httplib
.
IncompleteRead
,
 
httplib
.
ImproperConnectionState
,

  
httplib
.
CannotSendRequest
,
 
httplib
.
CannotSendHeader
,

  
httplib
.
ResponseNotReady
,
 
httplib
.
BadStatusLine
)

# Always retry when an apiclient.errors.HttpError with one of these status

# codes is raised.

RETRIABLE_STATUS_CODES
 
=
 
[
500
,
 
502
,
 
503
,
 
504
]

# The CLIENT_SECRETS_FILE variable specifies the name of a file that contains

# the OAuth 2.0 information for this application, including its client_id and

# client_secret. You can acquire an OAuth 2.0 client ID and client secret from

# the Google API Console at

# https://console.cloud.google.com/.

# Please ensure that you have enabled the YouTube Data API for your project.

# For more information about using OAuth2 to access the YouTube Data API, see:

#   authentication.md

# For more information about the client_secrets.json file format, see:

#   https://developers.google.com/api-client-library/python/guide/aaa_client_secrets

CLIENT_SECRETS_FILE
 
=
 
"client_secrets.json"

# This OAuth 2.0 access scope allows an application to upload files to the

# authenticated user's YouTube channel, but doesn't allow other types of access.

YOUTUBE_UPLOAD_SCOPE
 
=
 
"https://www.googleapis.com/auth/youtube.upload"

YOUTUBE_API_SERVICE_NAME
 
=
 
"youtube"

YOUTUBE_API_VERSION
 
=
 
"v3"

# This variable defines a message to display if the CLIENT_SECRETS_FILE is

# missing.

MISSING_CLIENT_SECRETS_MESSAGE
 
=
 
"""

WARNING: Please configure OAuth 2.0

To make this sample run you will need to populate the client_secrets.json file

found at:

   
%s

with information from the API Console

https://console.cloud.google.com/

For more information about the client_secrets.json file format, please visit:

https://developers.google.com/api-client-library/python/guide/aaa_client_secrets

"""
 
%
 
os
.
path
.
abspath
(
os
.
path
.
join
(
os
.
path
.
dirname
(
__file__
),

                                   
CLIENT_SECRETS_FILE
))

VALID_PRIVACY_STATUSES
 
=
 
(
"public"
,
 
"private"
,
 
"unlisted"
)

def
 
get_authenticated_service
(
args
):

  
flow
 
=
 
flow_from_clientsecrets
(
CLIENT_SECRETS_FILE
,

    
scope
=
YOUTUBE_UPLOAD_SCOPE
,

    
message
=
MISSING_CLIENT_SECRETS_MESSAGE
)

  
storage
 
=
 
Storage
(
"
%s
-oauth2.json"
 
%
 
sys
.
argv
[
0
])

  
credentials
 
=
 
storage
.
get
()

  
if
 
credentials
 
is
 
None
 
or
 
credentials
.
invalid
:

    
credentials
 
=
 
run_flow
(
flow
,
 
storage
,
 
args
)

  
return
 
build
(
YOUTUBE_API_SERVICE_NAME
,
 
YOUTUBE_API_VERSION
,

    
http
=
credentials
.
authorize
(
httplib2
.
Http
()))

def
 
initialize_upload
(
youtube
,
 
options
):

  
tags
 
=
 
None

  
if
 
options
.
keywords
:

    
tags
 
=
 
options
.
keywords
.
split
(
","
)

  
body
=
dict
(

    
snippet
=
dict
(

      
title
=
options
.
title
,

      
description
=
options
.
description
,

      
tags
=
tags
,

      
categoryId
=
options
.
category

    
),

    
status
=
dict
(

      
privacyStatus
=
options
.
privacyStatus

    
)

  
)

  
# Call the API's videos.insert method to create and upload the video.

  
insert_request
 
=
 
youtube
.
videos
()
.
insert
(

    
part
=
","
.
join
(
body
.
keys
()),

    
body
=
body
,

    
# The chunksize parameter specifies the size of each chunk of data, in

    
# bytes, that will be uploaded at a time. Set a higher value for

    
# reliable connections as fewer chunks lead to faster uploads. Set a lower

    
# value for better recovery on less reliable connections.

    
#

    
# Setting "chunksize" equal to -1 in the code below means that the entire

    
# file will be uploaded in a single HTTP request. (If the upload fails,

    
# it will still be retried where it left off.) This is usually a best

    
# practice, but if you're using Python older than 2.6 or if you're

    
# running on App Engine, you should set the chunksize to something like

    
# 1024 * 1024 (1 megabyte).

    
media_body
=
MediaFileUpload
(
options
.
file
,
 
chunksize
=-
1
,
 
resumable
=
True
)

  
)

  
resumable_upload
(
insert_request
)

# This method implements an exponential backoff strategy to resume a

# failed upload.

def
 
resumable_upload
(
insert_request
):

  
response
 
=
 
None

  
error
 
=
 
None

  
retry
 
=
 
0

  
while
 
response
 
is
 
None
:

    
try
:

      
print
 
"Uploading file..."

      
status
,
 
response
 
=
 
insert_request
.
next_chunk
()

      
if
 
response
 
is
 
not
 
None
:

        
if
 
'id'
 
in
 
response
:

          
print
 
"Video id '
%s
' was successfully uploaded."
 
%
 
response
[
'id'
]

        
else
:

          
exit
(
"The upload failed with an unexpected response: 
%s
"
 
%
 
response
)

    
except
 
HttpError
,
 
e
:

      
if
 
e
.
resp
.
status
 
in
 
RETRIABLE_STATUS_CODES
:

        
error
 
=
 
"A retriable HTTP error 
%d
 occurred:
\n
%s
"
 
%
 
(
e
.
resp
.
status
,

                                                             
e
.
content
)

      
else
:

        
raise

    
except
 
RETRIABLE_EXCEPTIONS
,
 
e
:

      
error
 
=
 
"A retriable error occurred: 
%s
"
 
%
 
e

    
if
 
error
 
is
 
not
 
None
:

      
print
 
error

      
retry
 
+=
 
1

      
if
 
retry
 > 
MAX_RETRIES
:

        
exit
(
"No longer attempting to retry."
)

      
max_sleep
 
=
 
2
 
**
 
retry

      
sleep_seconds
 
=
 
random
.
random
()
 
*
 
max_sleep

      
print
 
"Sleeping 
%f
 seconds and then retrying..."
 
%
 
sleep_seconds

      
time
.
sleep
(
sleep_seconds
)

if
 
__name__
 
==
 
'__main__'
:

  
argparser
.
add_argument
(
"--file"
,
 
required
=
True
,
 
help
=
"Video file to upload"
)

  
argparser
.
add_argument
(
"--title"
,
 
help
=
"Video title"
,
 
default
=
"Test Title"
)

  
argparser
.
add_argument
(
"--description"
,
 
help
=
"Video description"
,

    
default
=
"Test Description"
)

  
argparser
.
add_argument
(
"--category"
,
 
default
=
"22"
,

    
help
=
"Numeric video category. "
 
+

      
"See https://developers.google.com/youtube/v3/docs/videoCategories/list"
)

  
argparser
.
add_argument
(
"--keywords"
,
 
help
=
"Video keywords, comma separated"
,

    
default
=
""
)

  
argparser
.
add_argument
(
"--privacyStatus"
,
 
choices
=
VALID_PRIVACY_STATUSES
,

    
default
=
VALID_PRIVACY_STATUSES
[
0
],
 
help
=
"Video privacy status."
)

  
args
 
=
 
argparser
.
parse_args
()

  
if
 
not
 
os
.
path
.
exists
(
args
.
file
):

    
exit
(
"Please specify a valid file using the --file= parameter."
)

  
youtube
 
=
 
get_authenticated_service
(
args
)

  
try
:

    
initialize_upload
(
youtube
,
 
args
)

  
except
 
HttpError
,
 
e
:

    
print
 
"An HTTP error 
%d
 occurred:
\n
%s
"
 
%
 
(
e
.
resp
.
status
,
 
e
.
content
)
```
## Additional resources
- The Authentication guide provides complete details for implementing OAuth 2.0 .
- The reference documentation explains the fields in a video resource.