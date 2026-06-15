# Agents Overview
- On this page
- Available Managed agents
- Security and best practices Network access External tools and APIs Human oversight
- Pricing
- Limits
- Agent frameworks
Managed agents on the Gemini API give you a configurable agent harness. A single API call provisions a Linux sandbox where the agent reasons, executes code, manages files, and browses the web autonomously.
Quickstart
Make your first agent call, stream responses, and build a custom agent.
Antigravity Agent
Capabilities, tools, multimodal input, and pricing for the default agent.
Agents in AI Studio
Visual playground for prototyping agents without writing code.
## Available Managed agents
- Antigravity agent : General-purpose managed agent powered by Gemini 3.5 Flash. Runs code, manages files, and searches the web inside a secure Linux sandbox hosted by Google. You can extend it with your own instructions, skills, and data to build a custom agent .
- Deep Research : Autonomous research agent that plans, executes, and synthesizes multi-step research tasks for use cases like market analysis, due diligence, and literature reviews.
## Security and best practices
Every agent runs in a sandboxed environment that is isolated at the OS level. The sandbox has unrestricted outbound network access by default. You can restrict or disable network access using an allowlist.
### Network access
By default, environments have unrestricted outbound network access. Use a network allowlist to restrict outbound traffic to specific domains or wildcard patterns. For configuration details, see Network Allow List (AI Studio) or Network rules (API).
### External tools and APIs
You can connect external tools and APIs to extend the agent. Only use tools from trusted sources and scope permissions to the minimum required. Credentials can be injected securely via egress proxy header transformations and are never exposed inside the sandbox. The agent may use any credential it has access to, so only provide credentials whose full scope you are willing to grant.
- Use least-privilege service accounts or API keys.
- Prefer short-lived tokens over long-lived keys.
- Only provide credentials whose full scope you are willing to grant.
- Rotate credentials on a regular schedule.
For details on configuring header transformations, see Credentials .
### Human oversight
Always verify outputs (generated code, data transformations, configuration changes) before deploying them, especially for tasks that modify data or interact with external systems.
## Pricing
Managed agents use a pay-as-you-go model based on Gemini model tokens and tool usage. A single interaction can trigger multiple reasoning loops, typically consuming 100k to 3M tokens. Environment compute is not billed during the preview. See estimated costs for per-task breakdowns.
## Limits
| Limit | Description |
| --- | --- |
| Environment Lifetime | Environments are permanently deleted after 7 days of inactivity. |
| VM Spin-down | VMs shut down after a brief period of inactivity to conserve resources. The next request restores the state (with a cold start). |
| Pre-installed Software | Ubuntu-based environment with Python 3.12 and Node.js 22. For more information on the environment's base image, see Pre-installed software . |
| Max agents | You can have up to 1,000 managed agents. |
## Agent frameworks
You can also build agents with Gemini using these frameworks and SDKs:
- LangChain / LangGraph : Build stateful, complex application flows and multi-agent systems using graph structures.
- LlamaIndex : Connect Gemini agents to your private data for RAG-enhanced workflows.
- CrewAI : Orchestrate collaborative, role-playing autonomous AI agents.
- Vercel AI SDK : Build AI-powered user interfaces and agents in JavaScript/TypeScript.
- Google ADK : An open-source framework for building and orchestrating interoperable AI agents.
- Antigravity SDK : Build autonomous AI agents using the same tools, agent loop, and context management that power Google Antigravity, programmable in Python.