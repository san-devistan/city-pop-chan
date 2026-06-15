- On this page
- How to use Priority
- How Priority inference works Key benefits Use cases Rate limits Graceful downgrade logic Client responsibility
- Pricing
- Supported models
- What's next
# Priority inference
The Gemini Priority API is a premium inference tier designed for business-critical workloads that require lower latency and the highest reliability at a premium price point. Priority tier traffic is prioritized above standard API and Flex tier traffic.
Priority inference is available across the Interactions API endpoints.
## How to use Priority
To use the Priority tier, set the service_tier field in your request to priority . The default tier is standard if the field is omitted.
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
"Triage this critical customer support ticket immediately."
,

        
service_tier
=
'priority'

    
)

    
print
(
interaction
.
output_text
)

except
 
Exception
 
as
 
e
:

    
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
 
"Triage this critical customer support ticket immediately."
,

          
service_tier
:
 
"priority"

      
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
curl
 
-X
 
POST
 
"https://generativelanguage.googleapis.com/v1beta/interactions"
 
\

  
-H
 
"Content-Type: application/json"
 
\

  
-H
 
"x-goog-api-key: 
$GEMINI_API_KEY
"
 
\

  
-H
 
"Api-Revision: 2026-05-20"
 
\

  
-d
 
'{

    "model": "gemini-3.5-flash",

    "input": "Triage this critical customer support ticket immediately.",

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
- Low friction : Uses the same synchronous create method as the standard and Flex tiers.
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
| Gemini 2.5 Pro | ✔️ |
| Gemini 2.5 Flash | ✔️ |
| Gemini 2.5 Flash-Lite | ✔️ |
## What's next
- Flex inference for cost reduction.
- Tokens : Understand tokens.