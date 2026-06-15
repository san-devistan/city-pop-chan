# Get started with Gemini Live API using the Google Gen AI SDK
- On this page
- Overview
- Connecting to the Live API
- Sending text
- Sending audio
- Sending video
- Receiving audio
- Receiving text
- Handling tool calls
- What's next
The Gemini Live API allows for real-time, bidirectional interaction with Gemini models, supporting audio, video, and text inputs and native audio outputs. This guide explains how to integrate with the API using the Google GenAI SDK on your server.
## Overview
The Gemini Live API uses WebSockets for real-time communication. The google-genai SDK provides a high-level asynchronous interface for managing these connections.
Key concepts:
- Session : A persistent connection to the model.
- Config : Setting up modalities (audio/text), voice, and system instructions.
- Real-time Input : Sending audio and video frames as blobs.
## Connecting to the Live API
Start a Live API session with an API key:
```
import
 
asyncio

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
"YOUR_API_KEY"
)

model
 
=
 
"gemini-3.1-flash-live-preview"

config
 
=
 
{
"response_modalities"
:
 
[
"AUDIO"
]}

async
 
def
 
main
():

    
async
 
with
 
client
.
aio
.
live
.
connect
(
model
=
model
,
 
config
=
config
)
 
as
 
session
:

        
print
(
"Session started"
)

        
# Send content...

if
 
__name__
 
==
 
"__main__"
:

    
asyncio
.
run
(
main
())
```
```
import
 
{
 
GoogleGenAI
,
 
Modality
 
}
 
from
 
'@google/genai'
;

const
 
ai
 
=
 
new
 
GoogleGenAI
({
 
apiKey
:
 
"YOUR_API_KEY"
});

const
 
model
 
=
 
'gemini-3.1-flash-live-preview'
;

const
 
config
 
=
 
{
 
responseModalities
:
 
[
Modality
.
AUDIO
]
 
};

async
 
function
 
main
()
 
{

  
const
 
session
 
=
 
await
 
ai
.
live
.
connect
({

    
model
:
 
model
,

    
callbacks
:
 
{

      
onopen
:
 
function
 
()
 
{

        
console
.
debug
(
'Opened'
);

      
},

      
onmessage
:
 
function
 
(
message
)
 
{

        
console
.
debug
(
message
);

      
},

      
onerror
:
 
function
 
(
e
)
 
{

        
console
.
debug
(
'Error:'
,
 
e
.
message
);

      
},

      
onclose
:
 
function
 
(
e
)
 
{

        
console
.
debug
(
'Close:'
,
 
e
.
reason
);

      
},

    
},

    
config
:
 
config
,

  
});

  
console
.
debug
(
"Session started"
);

  
// Send content...

  
session
.
close
();

}

main
();
```
## Sending text
Text can be sent using send_realtime_input (Python) or sendRealtimeInput (JavaScript).
```
await
 
session
.
send_realtime_input
(
text
=
"Hello, how are you?"
)
```
```
session
.
sendRealtimeInput
({

  
text
:
 
'Hello, how are you?'

});
```
## Sending audio
Audio needs to be sent as raw PCM data (raw 16-bit PCM audio, 16kHz, little-endian).
```
# Assuming 'chunk' is your raw PCM audio bytes

await
 
session
.
send_realtime_input
(

    
audio
=
types
.
Blob
(

        
data
=
chunk
,

        
mime_type
=
"audio/pcm;rate=16000"

    
)

)
```
```
// Assuming 'chunk' is a Buffer of raw PCM audio

session
.
sendRealtimeInput
({

  
audio
:
 
{

    
data
:
 
chunk
.
toString
(
'base64'
),

    
mimeType
:
 
'audio/pcm;rate=16000'

  
}

});
```
For an example of how to get the audio from the client device (e.g. the browser) see the end-to-end example on GitHub .
## Sending video
Video frames are sent as individual images (e.g., JPEG or PNG) at a specific frame rate (max 1 frame per second).
```
# Assuming 'frame' is your JPEG-encoded image bytes

await
 
session
.
send_realtime_input
(

    
video
=
types
.
Blob
(

        
data
=
frame
,

        
mime_type
=
"image/jpeg"

    
)

)
```
```
// Assuming 'frame' is a Buffer of JPEG-encoded image data

session
.
sendRealtimeInput
({

  
video
:
 
{

    
data
:
 
frame
.
toString
(
'base64'
),

    
mimeType
:
 
'image/jpeg'

  
}

});
```
For an example of how to get the video from the client device (e.g. the browser) see the end-to-end example on GitHub .
## Receiving audio
The model's audio responses are received as chunks of data.
```
async
 
for
 
response
 
in
 
session
.
receive
():

    
if
 
response
.
server_content
 
and
 
response
.
server_content
.
model_turn
:

        
for
 
part
 
in
 
response
.
server_content
.
model_turn
.
parts
:

            
if
 
part
.
inline_data
:

                
audio_data
 
=
 
part
.
inline_data
.
data

                
# Process or play the audio data
```
```
// Inside the onmessage callback

const
 
content
 
=
 
response
.
serverContent
;

if
 
(
content
?
.
modelTurn
?
.
parts
)
 
{

  
for
 
(
const
 
part
 
of
 
content
.
modelTurn
.
parts
)
 
{

    
if
 
(
part
.
inlineData
)
 
{

      
const
 
audioData
 
=
 
part
.
inlineData
.
data
;

      
// Process or play audioData (base64 encoded string)

    
}

  
}

}
```
See the example app on GitHub to learn how to receive the audio on your server and play it in the browser .
## Receiving text
Transcriptions for both user input and model output are available in the server content.
```
async
 
for
 
response
 
in
 
session
.
receive
():

    
content
 
=
 
response
.
server_content

    
if
 
content
:

        
if
 
content
.
input_transcription
:

            
print
(
f
"User: 
{
content
.
input_transcription
.
text
}
"
)

        
if
 
content
.
output_transcription
:

            
print
(
f
"Gemini: 
{
content
.
output_transcription
.
text
}
"
)
```
```
// Inside the onmessage callback

const
 
content
 
=
 
response
.
serverContent
;

if
 
(
content
?
.
inputTranscription
)
 
{

  
console
.
log
(
'User:'
,
 
content
.
inputTranscription
.
text
);

}

if
 
(
content
?
.
outputTranscription
)
 
{

  
console
.
log
(
'Gemini:'
,
 
content
.
outputTranscription
.
text
);

}
```
## Handling tool calls
The API supports tool calling (function calling). When the model requests a tool call, you must execute the function and send the response back.
```
async
 
for
 
response
 
in
 
session
.
receive
():

    
if
 
response
.
tool_call
:

        
function_responses
 
=
 
[]

        
for
 
fc
 
in
 
response
.
tool_call
.
function_calls
:

            
# 1. Execute the function locally

            
result
 
=
 
my_tool_function
(
**
fc
.
args
)

            
# 2. Prepare the response

            
function_responses
.
append
(
types
.
FunctionResponse
(

                
name
=
fc
.
name
,

                
id
=
fc
.
id
,

                
response
=
{
"result"
:
 
result
}

            
))

        
# 3. Send the tool response back to the session

        
await
 
session
.
send_tool_response
(
function_responses
=
function_responses
)
```
```
// Inside the onmessage callback

if
 
(
response
.
toolCall
)
 
{

  
const
 
functionResponses
 
=
 
[];

  
for
 
(
const
 
fc
 
of
 
response
.
toolCall
.
functionCalls
)
 
{

    
const
 
result
 
=
 
myToolFunction
(
fc
.
args
);

    
functionResponses
.
push
({

      
name
:
 
fc
.
name
,

      
id
:
 
fc
.
id
,

      
response
:
 
{
 
result
 
}

    
});

  
}

  
session
.
sendToolResponse
({
 
functionResponses
 
});

}
```
## What's next
- Read the full Live API Capabilities guide for key capabilities and configurations; including Voice Activity Detection and native audio features.
- Read the Tool use guide to learn how to integrate Live API with tools and function calling.
- Read the Session management guide for managing long running conversations.
- Read the Ephemeral tokens guide for secure authentication in client-to-server applications.
- For more information about the underlying WebSockets API, see the WebSockets API reference .