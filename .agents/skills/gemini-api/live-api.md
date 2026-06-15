# Gemini Live API overview
- On this page
- Use cases
- Key features
- Technical specifications
- Choose an implementation approach
- Get started
- Partner integrations
The Live API enables low-latency, real-time voice and vision interactions with Gemini. It processes continuous streams of audio, images, and text to deliver immediate, human-like spoken responses, creating a natural conversational experience for your users.
## Use cases
Live API can be used to build real-time voice agents for a variety of industries, including:
- E-commerce and retail: Shopping assistants that offer personalized recommendations and support agents that resolve customer issues.
- Gaming: Interactive non-player characters (NPCs), in-game help assistants, and real-time translation of in-game content.
- Next-gen interfaces: Voice- and video-enabled experiences in robotics, smart glasses, and vehicles.
- Healthcare: Health companions for patient support and education.
- Financial services: AI advisors for wealth management and investment guidance.
- Education: AI mentors and learner companions that provide personalized instruction and feedback.
## Key features
Live API offers a comprehensive set of features for building robust voice agents:
- Multilingual support : Converse in 70 supported languages.
- Barge-in : Users can interrupt the model at any time for responsive interactions.
- Tool use : Integrates tools like function calling and Google Search for dynamic interactions.
- Audio transcriptions : Provides text transcripts of both user input and model output.
- Proactive audio : Lets you control when the model responds and in what contexts.
- Affective dialog : Adapts response style and tone to match the user's input expression.
## Technical specifications
The following table outlines the technical specifications for the Live API:
| Category | Details |
| --- | --- |
| Input modalities | Audio (raw 16-bit PCM audio, 16kHz, little-endian), images (JPEG <= 1FPS), text |
| Output modalities | Audio (raw 16-bit PCM audio, 24kHz, little-endian) |
| Protocol | Stateful WebSocket connection (WSS) |
## Choose an implementation approach
When integrating with Live API, you'll need to choose one of the following implementation approaches:
- Server-to-server : Your backend connects to the Live API using WebSockets . Typically, your client sends stream data (audio, video, text) to your server, which then forwards it to the Live API.
- Client-to-server : Your frontend code connects directly to the Live API using WebSockets to stream data, bypassing your backend.
## Get started
Select the guide that matches your development environment:
### GenAI SDK tutorial
Connect to the Gemini Live API using the GenAI SDK to build a real-time multimodal application with a Python backend.
### WebSocket tutorial
Connect to the Gemini Live API using WebSockets to build a real-time multimodal application with a JavaScript frontend and ephemeral tokens.
### ADK tutorial
Create an agent and use the Agent Development Kit (ADK) Streaming to enable voice and video communication.
## Partner integrations
To streamline the development of real-time audio and video apps, you can use a third-party integration that supports the Gemini Live API over WebRTC or WebSockets.
LiveKit
Use the Gemini Live API with LiveKit Agents.
Pipecat by Daily
Create a real-time AI chatbot using Gemini Live and Pipecat.
Fishjam by Software Mansion
Create live video and audio streaming applications with Fishjam.
Vision Agents by Stream
Build real-time voice and video AI applications with Vision Agents.
Voximplant
Connect inbound and outbound calls to Live API with Voximplant.
Agora
Build real-time conversational AI applications with Agora.
Firebase AI SDK
Get started with the Gemini Live API using Firebase AI Logic.