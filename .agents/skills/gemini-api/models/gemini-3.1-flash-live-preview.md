# Gemini 3. 1 Flash Live Preview
- On this page
- Documentation
- gemini-3.1-flash-live-preview
- Migrating from Gemini 2.5 Flash Live
Gemini 3.1 Flash Live Preview is our low-latency, audio-to-audio model optimized for real-time dialogue and voice-first AI applications with acoustic nuance detection, numeric precision, and multimodal awareness.
## Documentation
Visit the Live API guide for full coverage of features and capabilities.
## gemini-3. 1-flash-live-preview
| Property | Description |
| --- | --- |
| id_card Model code | gemini-3. 1-flash-live-preview |
| save Supported data types | Inputs Text, images, audio, video Output Text and audio |
| token_auto Token limits [*] | Input token limit 131,072 Output token limit 65,536 |
| handyman Capabilities | Audio generation Supported Batch API Not supported Caching Not supported Code execution Not supported File search Not Supported Function calling Supported Grounding with Google Maps Not supported Image generation Not supported Live API Supported Search grounding Supported Structured outputs Not supported Thinking Supported URL context Not supported |
| 123 Versions | Read the model version patterns for more details. Preview: gemini-3.1-flash-live-preview |
| calendar_month Latest update | March 2026 |
| cognition_2 Knowledge cutoff | January 2025 |
## Migrating from Gemini 2.5 Flash Live
Gemini 3.1 Flash Live Preview is optimized for low-latency, real-time dialogue. When migrating from gemini-2.5-flash-native-audio-preview-12-2025 , consider the following:
- Model string : Update your model string from gemini-2.5-flash-native-audio-preview-12-2025 to gemini-3.1-flash-live-preview .
- Thinking configuration : Gemini 3.1 uses thinkingLevel (with settings like minimal , low , medium , and high ) instead of thinkingBudget . The default is minimal to optimize for lowest latency. See Thinking levels and budgets .
- Server events : A single BidiGenerateContentServerContent event can now contain multiple content parts simultaneously (for example, audio chunks and transcript). Update your code to process all parts in each event to avoid missing content.
- Client content : send_client_content is only supported for seeding initial context history (requires setting initial_history_in_client_content in history_config ). Use send_realtime_input to send text updates during the conversation. See Incremental content updates .
- Turn coverage : Defaults to TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO instead of TURN_INCLUDES_ONLY_ACTIVITY . The model's turn now includes detected audio activity and all video frames. If your application currently sends a constant stream of video frames, you may want to update your application to only send video frames when there is audio activity to avoid incurring additional costs.
- Async function calling : Not yet supported. Function calling is synchronous only. The model will not start responding until you've sent the tool response. See Async function calling .
- Proactive audio and affective dialogue : These features are not yet supported in Gemini 3.1 Flash Live. Remove any configuration for these features from your code. See Proactive audio and Affective dialogue .
For a detailed feature comparison, see the Model comparison table in the capabilities guide.