---
name: gemini-api
description: "Documentation for the Gemini API on ai.google.dev. Use when the user asks about Gemini API, Google GenAI SDK, google-genai, @google/genai, generateContent, Interactions API, Live API, Gemini models, Nano Banana, Veo, Lyria, Imagen, embeddings, function calling, tools, grounding, Files API, Batch API, OpenAI compatibility, Google AI Studio, migration, pricing, rate limits, safety, or troubleshooting from https://ai.google.dev/gemini-api/docs."
---

# Gemini API Documentation

> 169 pages from [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)

This `SKILL.md` is an index, not the full documentation. The actual docs are the linked markdown files in this skill folder.

## Required Lookup

When this skill triggers for a documentation question:

1. Search this skill folder or choose the relevant entry from Contents.
2. Read at least one linked `.md` file before answering API, syntax, configuration, behavior, migration, or troubleshooting questions.
3. Read multiple files when the answer spans concepts, examples, reference pages, or framework integrations.
4. Treat the local markdown files as the source of truth. If the local docs do not cover the question, say that instead of filling gaps from memory.

## Overview

These docs cover the Gemini Developer API, Google AI Studio, and Google GenAI SDK usage across Python, JavaScript/TypeScript, Go, REST, and OpenAI-compatible clients. The API surface includes the classic `generateContent` flow, the newer Interactions API for agentic and multi-turn workflows, and the Live API for low-latency audio/video sessions. The guide set also covers multimodal generation and understanding, tools and grounding, model selection, embeddings, files and batch workflows, managed agents, pricing, rate limits, safety, migrations, and operational troubleshooting.

## Contents

### Getting Started and Setup

- [Gemini API](index.md)
- [Gemini API quickstart](quickstart.md)
- [Google AI Studio quickstart](ai-studio-quickstart.md)
- [Using Gemini API keys](api-key.md)
- [Gemini API libraries](libraries.md)
- [API versions explained](api-versions.md)
- [Authentication with OAuth quickstart](oauth.md)
- [Available regions for Google AI Studio and Gemini API](available-regions.md)
- [Billing](billing.md)
- [Gemini Developer API pricing](pricing.md)
- [Rate limits](rate-limits.md)
- [Models](models.md)
- [Release notes](changelog.md)
- [Gemini deprecations](deprecations.md)

### Generation APIs and Core Concepts

- [Text generation](text-generation.md)
- [Structured outputs](structured-output.md)
- [Gemini thinking](thinking.md)
- [Thought Signatures](thought-signatures.md)
- [Understand and count tokens](tokens.md)
- [Long context](long-context.md)
- [Context caching](caching.md)
- [Batch API](batch-api.md)
- [Files API](files.md)
- [File input methods](file-input-methods.md)
- [Embeddings](embeddings.md)
- [Fine-tuning with the Gemini API](model-tuning.md)
- [Gemini API optimization and inference](optimization.md)
- [Prompt design strategies](prompting-strategies.md)

### Modalities and Media

- [Audio understanding](audio.md)
- [Image understanding](image-understanding.md)
- [Nano Banana image generation](image-generation.md)
- [Generate images using Imagen](imagen.md)
- [Video understanding](video-understanding.md)
- [Generate videos with Veo 3.1 in Gemini API](video.md)
- [Document understanding](document-processing.md)
- [Text-to-speech generation (TTS)](speech-generation.md)
- [Generate music with Lyria 3](music-generation.md)
- [Real-time music generation using Lyria Real Time](realtime-music-generation.md)
- [Media resolution](media-resolution.md)
- [Gemini 3 Developer Guide](gemini-3.md)
- [Accelerate discovery with Gemini for Research](gemini-for-research.md)
- [Learn LM](learnlm.md)
- [Gemini Robotics-ER 1.6](robotics-overview.md)

### Tools, Grounding, Retrieval, and Webhooks

- [Using Tools with Gemini API](tools.md)
- [Function calling with the Gemini API](function-calling.md)
- [Combine built-in tools and function calling](tool-combination.md)
- [Code execution](code-execution.md)
- [Grounding with Google Search](google-search.md)
- [Grounding with Google Maps](maps-grounding.md)
- [URL context](url-context.md)
- [File Search](file-search.md)
- [Flex inference](flex-inference.md)
- [Priority inference](priority-inference.md)
- [Webhooks](webhooks.md)

### Agents, AI Studio, and Integrations

- [Agents Overview](agents.md)
- [Managed Agents Quickstart](managed-agents-quickstart.md)
- [Building Managed Agents](custom-agents.md)
- [Environments in Managed Agents](agent-environment.md)
- [Antigravity Agent](antigravity-agent.md)
- [Computer Use](computer-use.md)
- [Set up your coding assistant with Gemini MCP and Skills](coding-agents.md)
- [Agents in AI Studio Playground](aistudio-agents.md)
- [Build apps in Google AI Studio](aistudio-build-mode.md)
- [Build Android Apps in Google AI Studio](aistudio-android.md)
- [Deploying from Google AI Studio](aistudio-deploying.md)
- [Develop Full-Stack Apps in Google AI Studio](aistudio-fullstack.md)
- [Troubleshoot Google AI Studio](troubleshoot-ai-studio.md)
- [Access Google AI Studio with your Workspace account](workspace.md)
- [Partner and library integrations](partner-integration.md)
- [Open AI compatibility](openai.md)
- [Customer support analysis with Gemini and Crew AI](crewai-example.md)
- [Re Act agent from scratch with Gemini and Lang Graph](langgraph-example.md)
- [Research agent with Gemini and Llama Index](llama-index.md)
- [Durable AI agent with Gemini and Temporal](temporal-example.md)
- [Market Research Agent with Gemini and the AI SDK by Vercel](vercel-ai-sdk-example.md)

### Safety, Data Policy, Migration, and Troubleshooting

- [Safety and factuality guidance](safety-guidance.md)
- [Safety settings](safety-settings.md)
- [Abuse monitoring](usage-policies.md)
- [Feedback](feedback-policies.md)
- [Data Logging and Sharing](logs-policy.md)
- [Logs and datasets](logs-datasets.md)
- [Zero data retention in the Gemini Developer API](zdr.md)
- [Migrate to the Google Gen AI SDK](migrate.md)
- [Gemini Developer API vs. Gemini Enterprise Agent Platform](migrate-to-cloud.md)
- [Migrating to the Interactions API](migrate-to-interactions.md)
- [Interactions API: Breaking changes migration guide (May 2026)](interactions-breaking-changes-may-2026.md)
- [Troubleshooting guide](troubleshooting.md)
- [What's new in Gemini 3.5 Flash](whats-new-gemini-3.5.md)

### Interactions API

- [Interactions API](interactions-overview.md)
- [Interactions API](interactions/interactions-overview.md)
- [Gemini API quickstart](interactions/quickstart.md)
- [Using Gemini API keys](interactions/api-key.md)
- [Text generation](interactions/text-generation.md)
- [Streaming interactions](interactions/streaming.md)
- [Structured outputs](interactions/structured-output.md)
- [Gemini thinking](interactions/thinking.md)
- [Thought Signatures](interactions/thought-signatures.md)
- [Understand and count tokens](interactions/tokens.md)
- [Function calling with the Gemini API](interactions/function-calling.md)
- [Combine built-in tools and function calling](interactions/tool-combination.md)
- [Code execution](interactions/code-execution.md)
- [Grounding with Google Search](interactions/google-search.md)
- [Grounding with Google Maps](interactions/maps-grounding.md)
- [URL context](interactions/url-context.md)
- [File Search](interactions/file-search.md)
- [Files API](interactions/files.md)
- [File input methods](interactions/file-input-methods.md)
- [Context caching](interactions/caching.md)
- [Flex inference](interactions/flex-inference.md)
- [Priority inference](interactions/priority-inference.md)
- [Audio understanding](interactions/audio.md)
- [Image understanding](interactions/image-understanding.md)
- [Nano Banana image generation](interactions/image-generation.md)
- [Video understanding](interactions/video-understanding.md)
- [Document understanding](interactions/document-processing.md)
- [Text-to-speech generation (TTS)](interactions/speech-generation.md)
- [Generate music with Lyria 3](interactions/music-generation.md)
- [Media resolution](interactions/media-resolution.md)
- [Computer Use](interactions/computer-use.md)
- [Gemini 3 Developer Guide](interactions/gemini-3.md)
- [Gemini Deep Research Agent](interactions/deep-research.md)
- [Webhooks](interactions/webhooks.md)
- [What's new in Gemini 3.5 Flash](interactions/whats-new-gemini-3.5.md)

### Live API

- [Gemini Live API overview](live-api.md)
- [Get started with Gemini Live API using the Google Gen AI SDK](live-api/get-started-sdk.md)
- [Get started with Gemini Live API using Web Sockets](live-api/get-started-websocket.md)
- [Live API capabilities guide](live-api/capabilities.md)
- [Session management with Live API](live-api/session-management.md)
- [Tool use with Live API](live-api/tools.md)
- [Ephemeral tokens](live-api/ephemeral-tokens.md)
- [Live API best practices](live-api/best-practices.md)

### Model Reference

- [Antigravity preview](models/antigravity-preview-05-2026.md)
- [Deep Research Max preview](models/deep-research-max-preview-04-2026.md)
- [Deep Research preview](models/deep-research-preview-04-2026.md)
- [Deep Research preview](models/deep-research-pro-preview-12-2025.md)
- [Gemini 2.0 Flash-Lite](models/gemini-2.0-flash-lite.md)
- [Gemini 2.0 Flash](models/gemini-2.0-flash.md)
- [Gemini 2.5 Computer Use model](models/gemini-2.5-computer-use-preview-10-2025.md)
- [Gemini 2.5 Flash Image (Nano Banana)](models/gemini-2.5-flash-image.md)
- [Gemini 2.5 Flash-Lite Preview](models/gemini-2.5-flash-lite-preview-09-2025.md)
- [Gemini 2.5 Flash-Lite](models/gemini-2.5-flash-lite.md)
- [Gemini 2.5 Flash Live Preview](models/gemini-2.5-flash-native-audio-preview-12-2025.md)
- [Gemini 2.5 Flash Preview](models/gemini-2.5-flash-preview-09-2025.md)
- [Gemini 2.5 Flash Text-to-Speech](models/gemini-2.5-flash-preview-tts.md)
- [Gemini 2.5 Flash](models/gemini-2.5-flash.md)
- [Gemini 2.5 Pro Text-to-Speech](models/gemini-2.5-pro-preview-tts.md)
- [Gemini 2.5 Pro](models/gemini-2.5-pro.md)
- [Gemini 3 Flash Preview](models/gemini-3-flash-preview.md)
- [Gemini 3 Pro Image](models/gemini-3-pro-image.md)
- [Gemini 3 Pro Preview](models/gemini-3-pro-preview.md)
- [Gemini 3.1 Flash Image](models/gemini-3.1-flash-image.md)
- [Gemini 3.1 Flash-Lite Preview](models/gemini-3.1-flash-lite-preview.md)
- [Gemini 3.1 Flash-Lite](models/gemini-3.1-flash-lite.md)
- [Gemini 3.1 Flash Live Preview](models/gemini-3.1-flash-live-preview.md)
- [Gemini 3.1 Flash TTS (Text-to-Speech) Preview](models/gemini-3.1-flash-tts-preview.md)
- [Gemini 3.1 Pro Preview](models/gemini-3.1-pro-preview.md)
- [Gemini 3.5 Flash](models/gemini-3.5-flash.md)
- [Gemini Embedding model](models/gemini-embedding-001.md)
- [Gemini Embedding 2 Preview model](models/gemini-embedding-2-preview.md)
- [Gemini Embedding 2 model](models/gemini-embedding-2.md)
- [Gemini Robotics-ER 1.5](models/gemini-robotics-er-1.5-preview.md)
- [Gemini Robotics-ER 1.6](models/gemini-robotics-er-1.6-preview.md)
- [Imagen 4](models/imagen.md)
- [Lyria 3 Clip Preview](models/lyria-3-clip-preview.md)
- [Lyria 3 Pro Preview](models/lyria-3-pro-preview.md)
- [Lyria Real Time experimental](models/lyria-realtime-exp.md)
- [Veo 2.0](models/veo-2.0-generate-001.md)
- [Veo 3.1](models/veo-3.1-generate-preview.md)
- [Veo 3.1 Lite Preview](models/veo-3.1-lite-generate-preview.md)

## Search Hints

- Use the Contents section when the topic maps cleanly to a page.
- Use text search inside this skill folder when the topic could appear in many pages, for example `rg -n "<api-or-topic>" .`.
- Prefer files with exact API names, component names, config keys, model IDs, endpoint names, or error messages.
- Read both the top-level page and the matching `interactions/` page when comparing `generateContent` and Interactions API behavior.
