# Priority inference
- On this page
- How to use Priority
- How Priority inference works Key benefits Use cases Rate limits Graceful downgrade logic Client responsibility
- Pricing
- Supported models
- What's next
The Gemini Priority API is a premium inference tier designed for business-critical workloads that require lower latency and the highest reliability at a premium price point. Priority tier traffic is prioritized above standard API and Flex tier traffic.
Priority inference is available to Tier 2 & Tier 3 users across the GenerateContent API and Interactions API endpoints.
## How to use Priority
To use the Priority tier, set the service_tier field in the request body to priority . The default tier is standard if the field is omitted.
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

try
:

    
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
"Triage this critical customer support ticket immediately."
,

        
config
=
{
"service_tier"
:
 
"priority"
},

    
)

    
# Validate for graceful downgrade

    
if
 
response
.
sdk_http_response
.
headers
.
get
(
"x-gemini-service-tier"
)
 
==
 
"standard"
:

        
print
(
"Warning: Priority limit exceeded, processed at Standard tier."
)

    
print
(
response
.
text
)

except
 
Exception
 
as
 
e
:

    
# Standard error handling (e.g., DEADLINE_EXCEEDED)

    
print
(
f
"Error during API call: 
{
e
}
"
)
```
```
import
 
{
GoogleGenAI
}
 
from
 
'@google/genai'
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

  
try
 
{

      
const
 
result
 
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
 
"Triage this critical customer support ticket immediately."
,

          
config
:
 
{
serviceTier
:
 
"priority"
},

      
});

      
// Validate for graceful downgrade

      
if
 
(
result
.
sdkHttpResponse
.
headers
.
get
(
"x-gemini-service-tier"
)
 
===
 
"standard"
)
 
{

          
console
.
log
(
"Warning: Priority limit exceeded, processed at Standard tier."
);

      
}

      
console
.
log
(
result
.
text
);

  
}
 
catch
 
(
e
)
 
{

      
console
.
log
(
`Error during API call: 
${
e
}
`
);

  
}

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

    
defer
 
client
.
Close
()

    
resp
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
"Triage this critical customer support ticket immediately."
),

        
&
genai
.
GenerateContentConfig
{

            
ServiceTier
:
 
"priority"
,

        
},

    
)

    
if
 
err
 
!=
 
nil
 
{

        
log
.
Fatalf
(
"Error during API call: %v"
,
 
err
)

    
}

    
// Validate for graceful downgrade

    
if
 
resp
.
SDKHTTPResponse
.
Header
.
Get
(
"x-gemini-service-tier"
)
 
==
 
"standard"
 
{

        
fmt
.
Println
(
"Warning: Priority limit exceeded, processed at Standard tier."
)

    
}

    
fmt
.
Println
(
resp
.
Text
())

}
```
```
curl
 
-X
 
POST
 
"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=
$GEMINI_API_KEY
"
 
\

-H
 
"Content-Type: application/json"
 
\

-d
 
'{

  "contents": [{

    "parts":[{"text": "Analyze user sentiment in real time"}]

  }],

  "service_tier": "priority"

}'
```
## How Priority inference works
Priority inference routes requests to high-criticality compute queues, offering predictable, fast performance for user-facing applications. Its primary mechanism is a graceful server-side downgrade to standard processing for traffic that exceeds dynamic limits, ensuring application stability instead of failing the request.
| Feature | Priority | Standard | Flex | Batch |
| --- | --- | --- | --- | --- |
| Pricing | 75-100% more than Standard | Full price | 50% discount | 50% discount |
| Latency | Seconds | Seconds to minutes | Minutes (1–15 min target) | Up to 24 hours |
| Reliability | High (Non-sheddable) | High / Medium-high | Best-effort (Sheddable) | High (for throughput) |
| Interface | Synchronous | Synchronous | Synchronous | Asynchronous |
### Key benefits
- Low latency : Designed for second response times for interactive, user-facing AI tools.
- High reliability : Traffic is treated with the highest criticality and is strictly non-sheddable.
- Graceful degradation : Traffic spikes exceeding dynamic limits are automatically downgraded to the Standard tier for processing instead of failing, preventing service outages.
- Low friction : Uses the same synchronous generateContent method as the standard and Flex tiers.
### Use cases
Priority processing is ideal for business-critical workflows where performance and reliability are paramount.
- Interactive AI applications : Customer service chatbots and copilots where users pay a premium and expect fast, consistent responses.
- Real-time decision engines : Systems requiring highly reliable, low-latency outcomes, such as live ticket triaging or fraud detection.
- Premium customer features : Developers who need to guarantee higher service level objectives (SLOs) for paying customers.
### Rate limits
Priority consumption holds its own rate limits even though consumption is counted towards overall interactive traffic rate limits . The default rate limits for Priority inference are 0.3x standard rate limit for Model / Tier
### Graceful downgrade logic
If Priority limits are exceeded due to congestion, overflow requests are automatically and gracefully downgraded to Standard processing instead of failing with a 503 or 429 error. Downgraded requests are billed at the standard rate, not the Priority premium rate.
### Client responsibility
- Response monitoring : Developers should monitor the x-gemini-service-tier header in the API response to detect if requests are being frequently downgraded to standard .
- Retries : Clients must implement retry logic/exponential backoff for standard errors, such as DEADLINE_EXCEEDED .
## Pricing
Priority inference is priced at 75-100% more than the standard API and billed per token.
## Supported models
The following models support Priority inference:
| Model | Priority inference |
| --- | --- |
| Gemini 3.5 Flash | ✔️ |
| Gemini 3.1 Flash-Lite | ✔️ |
| Gemini 3.1 Pro Preview | ✔️ |
| Gemini 3 Flash Preview | ✔️ |
| Gemini 3 Pro Image Preview | ✔️ |
| Gemini 2.5 Pro | ✔️ |
| Gemini 2.5 Flash | ✔️ |
| Gemini 2.5 Flash Image | ✔️ |
| Gemini 2.5 Flash-Lite | ✔️ |
## What's next
Read about Gemini's other inference and optimization options:
- Flex inference for 50% cost reduction.
- Batch API for asynchronous processing within 24 hours.
- Context caching for reduced input token costs.