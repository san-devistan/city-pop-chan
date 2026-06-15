# Using Tools with Gemini API
- On this page
- Available built-in tools
- How tools execution works Built-in tool flow Custom tool flow (Function calling) Combining built-in and custom tools flow
- Structured outputs vs. function calling
- Structured outputs with tools
Tools extend the capabilities of Gemini models, enabling them to take action in the world, access real-time information, and perform complex computational tasks. Models can use tools in both standard request-response interactions and real-time streaming sessions using the Live API .
Tools are specific capabilities (like Google Search or Code Execution) that a model can use to answer queries. The Gemini API provides a suite of fully managed, built-in tools, or you can define custom tools using Function Calling .
To build multi-step, goal-oriented systems, see the Agents Overview .
## Available built-in tools
| Tool | Description | Use Cases |
| --- | --- | --- |
| Google Search | Ground responses in current events and facts from the web to reduce hallucinations. | \- Answering questions about recent events \- Verifying facts with diverse sources |
| Google Maps | Build location-aware assistants that can find places, get directions, and provide rich local context. | \- Planning travel itineraries with multiple stops \- Finding local businesses based on user criteria |
| Code Execution | Allow the model to write and run Python code to solve math problems or process data accurately. | \- Solving complex mathematical equations \- Processing and analyzing text data precisely |
| URL Context | Direct the model to read and analyze content from specific web pages or documents. | \- Answering questions based on specific URLs or documents \- Retrieving information across different web pages |
| Computer Use (Preview) | Enable Gemini to view a screen and generate actions to interact with web browser UIs (Client-side execution). | \- Automating repetitive web-based workflows \- Testing web application user interfaces |
| File Search | Index and search your own documents to enable Retrieval Augmented Generation (RAG). | \- Searching technical manuals \- Question answering over proprietary data |
See the Pricing page for details on costs associated with specific tools.
## How tools execution works
Tools allow the model to request actions during a conversation. The flow differs depending on whether the tool is built-in (managed by Google) or custom (managed by you).
### Built-in tool flow
For built-in tools (Google Search, Google Maps, URL Context, File Search, Code Execution), the entire process happens within one API call:
1. You send a prompt: "What is the square root of the latest stock price of GOOG?"
2. Gemini decides it needs tools and executes them on Google's servers (e.g., searches for the stock price, then runs Python code to calculate the square root).
3. Gemini sends back the final answer grounded in the tool results.
### Custom tool flow (Function calling)
For custom tools and Computer Use, your application handles the execution:
1. You send a prompt along with functions (tools) declarations.
2. Gemini might send back structured JSON to call a specific function (for example, {"name": "get_order_status", "args": {"order_id": "123"}} ), always with a unique id .
3. You execute the function in your application or environment.
4. You send the function results, with the same id as the function call, back to Gemini.
5. Gemini uses the results to generate a final response or another tool call.
Learn more in the Function calling guide .
### Combining built-in and custom tools flow
For requests that combine built-in tools and custom tools (function calls), the model uses tool context circulation to coordinate execution across different environments:
1. You send a prompt and declare the built-in tools and custom functions you want to enable, setting a flag to turn on combination support.
2. Gemini executes built-in tools and yields to the user if any client-side function calls are generated (which executes first depends on the prompt and what the model decides). It sends back a response with: Confirmation of the tool call Results of the tool response (this may come after the JSON if the model generated two parallel function calls) Structured JSON to call your function Encrypted thought signatures to preserve context
3. You execute the function in your application or environment.
4. You return all parts of Gemini's response, plus your function call results.
5. Gemini generates the final response using all combined context.
Read the Tool combination guide to learn how to turn on support for built-in and custom tools combination and examples of context circulation.
## Structured outputs vs. function calling
Gemini offers two methods for generating structured outputs. Use Function calling when the model needs to perform an intermediate step by connecting to your own tools or data systems. Use Structured Outputs when you strictly need the model's final response to adhere to a specific schema, such as for rendering a custom UI.
## Structured outputs with tools
You can combine Structured Outputs with built-in tools to ensure that model responses grounded in external data or computation still adhere to a strict schema.
See Structured outputs with tools for code examples.