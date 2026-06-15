# Gemini API
The fastest path from prompt to production with Gemini, Veo, Nano Banana, and more.
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
()

response
 
=
 
client
.
models
.
generate_content
(

    
model
=
"gemini-3.5-flash"
,

    
contents
=
"Explain how AI works in a few words"
,

)

print
(
response
.
text
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
({});

async
 
function
 
main
()
 
{

  
const
 
response
 
=
 
await
 
ai
.
models
.
generateContent
({

    
model
:
 
"gemini-3.5-flash"
,

    
contents
:
 
"Explain how AI works in a few words"
,

  
});

  
console
.
log
(
response
.
text
);

}

await
 
main
();
```
```
package
 
main

import
 
(

    
"context"

    
"fmt"

    
"log"

    
"google.golang.org/genai"

)

func
 
main
()
 
{

    
ctx
 
:=
 
context
.
Background
()

    
client
,
 
err
 
:=
 
genai
.
NewClient
(
ctx
,
 
nil
)

    
if
 
err
 
!=
 
nil
 
{

        
log
.
Fatal
(
err
)

    
}

    
result
,
 
err
 
:=
 
client
.
Models
.
GenerateContent
(

        
ctx
,

        
"gemini-3.5-flash"
,

        
genai
.
Text
(
"Explain how AI works in a few words"
),

        
nil
,

    
)

    
if
 
err
 
!=
 
nil
 
{

        
log
.
Fatal
(
err
)

    
}

    
fmt
.
Println
(
result
.
Text
())

}
```
```
package
 
com.example
;

import
 
com.google.genai.Client
;

import
 
com.google.genai.types.GenerateContentResponse
;

public
 
class
 
GenerateTextFromTextInput
 
{

  
public
 
static
 
void
 
main
(
String
[]
 
args
)
 
{

    
Client
 
client
 
=
 
new
 
Client
();

    
GenerateContentResponse
 
response
 
=

        
client
.
models
.
generateContent
(

            
"gemini-3.5-flash"
,

            
"Explain how AI works in a few words"
,

            
null
);

    
System
.
out
.
println
(
response
.
text
());

  
}

}
```
```
using
 
System.Threading.Tasks
;

using
 
Google.GenAI
;

using
 
Google.GenAI.Types
;

public
 
class
 
GenerateContentSimpleText
 
{

  
public
 
static
 
async
 
Task
 
main
()
 
{

    
var
 
client
 
=
 
new
 
Client
();

    
var
 
response
 
=
 
await
 
client
.
Models
.
GenerateContentAsync
(

      
model
:
 
"gemini-3.5-flash"
,
 
contents
:
 
"Explain how AI works in a few words"

    
);

    
Console
.
WriteLine
(
response
.
Candidates
[
0
].
Content
.
Parts
[
0
].
Text
);

  
}

}
```
```
curl
 
"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"
 
\

  
-H
 
"x-goog-api-key: 
$GEMINI_API_KEY
"
 
\

  
-H
 
'Content-Type: application/json'
 
\

  
-X
 
POST
 
\

  
-d
 
'{

    "contents": [

      {

        "parts": [

          {

            "text": "Explain how AI works in a few words"

          }

        ]

      }

    ]

  }'
```
Follow our Quickstart guide to get an API key and make your first API call in minutes.
## Meet the models
auto_awesome Gemini 3.1 Pro New
Our most intelligent model, the best in the world for multimodal understanding, all built on state-of-the-art reasoning.
spark Gemini 3.5 Flash New
Frontier-class performance rivaling larger models at a fraction of the cost.
spark Gemini 3.1 Flash-Lite New
High-volume, cost-sensitive model with the performance and quality of the Gemini 3 series.
spark Gemini 3 Flash
Frontier-class performance rivaling larger models at a fraction of the cost.
🍌 Nano Banana 2 and Nano Banana Pro
State-of-the-art image generation and editing models.
video_library Veo 3.1
Our state-of-the-art video generation model, with native audio.
spark Gemini Robotics
A vision-language model (VLM) that brings Gemini's agentic capabilities to robotics and enables advanced reasoning in the physical world.
## Explore Capabilities
Native Image Generation (Nano Banana)
Generate and edit highly contextual images natively with Gemini 2.5 Flash Image.
Long Context
Input millions of tokens to Gemini models and derive understanding from unstructured images, videos, and documents.
Structured Outputs
Constrain Gemini to respond with JSON, a structured data format suitable for automated processing.
Function Calling
Build agentic workflows by connecting Gemini to external APIs and tools.
Video Generation with Veo 3.1
Create high-quality video content from text or image prompts with our state-of-the-art model.
Voice Agents with Live API
Build real-time voice applications and agents with the Live API.
Tools
Connect Gemini to the world through built-in tools like Google Search, URL Context, Google Maps, Code Execution and Computer Use.
Document Understanding
Process up to 1000 pages of PDF files with full multimodal understanding or other text-based file types.
Thinking
Explore how thinking capabilities improve reasoning for complex tasks and agents.
Test prompts, manage your API keys, monitor usage, and build prototypes.
Ask questions and find solutions from other developers and Google engineers.
Find detailed information about the Gemini API in the official reference documentation.
Check the status of Gemini API, Google AI Studio, and our model services.