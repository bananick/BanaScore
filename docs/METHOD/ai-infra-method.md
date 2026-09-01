# AI Infrastructure Guidelines

**Owner:** Aiko  
**Version:** 309.a  
**Purpose:** Multi-provider architecture, task-type routing, ADK/MCP/A2A readiness, Vertex AI, observability, cost controls

---

## Overview

This file defines **method-level AI guidelines**. Project-specific configs (custom agents, evals, schemas) live in `docs/project/AI-INFRA.md`.

> [!NOTE]
> **Two distinct things — don't conflate them.** This file is about **AI features *inside* the apps we
> build** (the runtime AI layer end-users hit). The **agent cohort that builds the apps** runs on the
> Claude suite and is documented in `agents-method.md` / `agents-engineering-method.md` (native
> sub-agents, Agent Teams, Cowork, Swanifly). The platform itself now **runs on Claude**; the in-app
> AI layer remains multi-provider by design.

**Key Principles:**

1. **Multi-provider**: Support Anthropic, Google, OpenAI, Mistral (not locked to one vendor)
2. **Claude default for agentic / tool use**: the platform runs on Claude; other providers are options (see routing)
3. **Layered architecture**: UI → Orchestration → Providers (clean separation)
4. **ADK/MCP ready**: Designed for Google ADK and Model Context Protocol
5. **Observable**: Log latency, tokens, cost, errors
6. **Cost-aware**: Budgets, guardrails, model selection, **prompt caching** (the primary cost lever)

---

## Layered Architecture

```
┌─────────────────────────────────────────────┐
│  UI Layer (Next.js components)              │
│  - User interactions                        │
│  - Display AI responses                     │
│  - Loading states, errors                   │
└──────────────┬──────────────────────────────┘
               │
               ↓ calls
┌─────────────────────────────────────────────┐
│  Orchestration Layer (business logic)       │
│  - Route to appropriate provider/model      │
│  - Retry logic, fallbacks                   │
│  - Cost tracking, budgets                   │
│  - Logging (latency, tokens, errors)        │
│  - Evals (quality checks)                   │
└──────────────┬──────────────────────────────┘
               │
               ↓ delegates
┌─────────────────────────────────────────────┐
│  Provider Layer (adapters)                  │
│  - Anthropic adapter (Opus 4.8, Sonnet 4.6, │
│      Haiku 4.5 — default for agentic/tools) │
│  - Google adapter (Fable 5, Gemini)         │
│  - OpenAI adapter (GPT family)              │
│  - Mistral adapter (text + vision)          │
│  - Each implements: complete(), stream()    │
└─────────────────────────────────────────────┘
```

### Responsibilities by Layer

**UI Layer:**
- Presentational components only
- No direct API calls to LLM providers
- Calls orchestration layer via server actions or API routes

**Orchestration Layer:**
- Task-type routing (select model by task nature, not just complexity)
- Retry with exponential backoff
- Fallback to secondary provider if primary fails
- Cost tracking (increment budget counters)
- Logging (save call metadata to Firestore or logs)
- Evals (run quality checks on responses)

**Provider Layer:**
- Thin adapters, one per provider
- Normalize API differences (all expose same interface)
- Handle provider-specific auth, headers, error codes
- Stream support (SSE) if available

---

## Multi-Provider Support

### Why Multi-Provider?

✅ **Avoid vendor lock-in**: Switch providers without rewriting app  
✅ **Leverage strengths**: Claude for agentic/tool use, logic & design; Fable 5 / Gemini for fast multimodal; GPT for emotion/copy nuance; Mistral for cheap vision  
✅ **Resilience**: Fallback if primary provider down  
✅ **Cost optimization**: Use cheaper models when sufficient; **prompt caching** on stable system context is the biggest lever

### Provider Adapter Interface

```typescript
// src/lib/ai/types.ts
export interface ProviderAdapter {
  name: 'openai' | 'anthropic' | 'google' | 'mistral' | 'vertex';
  
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<CompletionChunk>;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface CompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}
```

### Example: OpenAI Adapter

```typescript
// src/lib/ai/adapters/openai.ts
import OpenAI from 'openai';

export class OpenAIAdapter implements ProviderAdapter {
  name = 'openai' as const;
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    const response = await this.client.chat.completions.create({
      model: request.model, // OpenAI model id, e.g. 'gpt-5.1'
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stop: request.stopSequences,
    });
    
    return {
      content: response.choices[0].message.content ?? '',
      finishReason: response.choices[0].finish_reason === 'stop' ? 'stop' : 'length',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      latencyMs: Date.now() - startTime,
    };
  }
  
  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { content, done: false };
      }
    }
    
    yield { content: '', done: true };
  }
}
```

### Anthropic, Google, Mistral & Vertex Adapters

Similar structure, adapt to each provider's SDK:

- **Anthropic:** Uses `@anthropic-ai/sdk`, model names like `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`. 1M-context tier available; **enable prompt caching** on the stable system preamble. Default for agentic / tool-use.
- **Google:** Uses `@google/genai`, model names like `fable-5`, `gemini-flash` (fast multimodal)
- **Mistral:** Uses `@mistralai/mistralai`, model names like `mistral-large`, `pixtral-large` (multimodal)
- **Vertex AI:** Uses `@google-cloud/vertexai`, for embeddings and batch — requires GCP project

```typescript
// src/lib/ai/adapters/mistral.ts
import { Mistral } from '@mistralai/mistralai';

export class MistralAdapter implements ProviderAdapter {
  name = 'mistral' as const;
  private client: Mistral;
  
  constructor(apiKey: string) {
    this.client = new Mistral({ apiKey });
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const response = await this.client.chat.complete({
      model: request.model, // 'mistral-large', 'pixtral-large'
      messages: request.messages,
      temperature: request.temperature ?? 0.3,
      maxTokens: request.maxTokens,
    });
    
    return {
      content: response.choices[0].message.content ?? '',
      finishReason: response.choices[0].finishReason === 'stop' ? 'stop' : 'length',
      usage: {
        promptTokens: response.usage?.promptTokens ?? 0,
        completionTokens: response.usage?.completionTokens ?? 0,
        totalTokens: response.usage?.totalTokens ?? 0,
      },
      latencyMs: Date.now() - startTime,
    };
  }
  
  // Stream support similar to OpenAI adapter
  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> { /* ... */ }
}
```

**Store in:** `src/lib/ai/adapters/`

---

## Orchestration Layer

### Task-Type Model Routing

**Philosophy (2026): Claude-default for agentic & tool use; cost-route the rest.** The platform runs
on Claude, so anything **agentic** (multi-step reasoning, tool/function calling, code, design) defaults
to a Claude model — **Haiku 4.5** for cheap/fast, **Sonnet 4.6** for the workhorse, **Opus 4.8** for
deep reasoning. For **high-volume, latency-sensitive, or multimodal** work, route to a cheaper option
(**Fable 5** / Gemini Flash, Mistral) and escalate only when quality demands it. Other providers
remain first-class **options**, not the default.

| Task Type | Default | Escalate To | When to Escalate |
|-----------|---------|-------------|------------------|
| `fast-text` | **Haiku 4.5** | Fable 5 | When cost at volume dominates over tool-use quality |
| `fast-vision` | **Fable 5** | Mistral Pixtral | Complex document OCR |
| `emotion` | Sonnet 4.6 | **GPT (latest)** | When nuanced emotional intelligence matters (user sentiment, tone analysis) |
| `copy-review` | Sonnet 4.6 | **GPT (latest)** | When editorial precision is critical (public-facing copy, marketing) |
| `logic` | **Sonnet 4.6** | **Opus 4.8** | Deep multi-step reasoning, complex code architecture |
| `design` | **Sonnet 4.6** | **Opus 4.8** | Advanced component design, complex layout logic |
| `embedding` | **Vertex AI** | — | Always Vertex for scale |
| `batch` | **Fable 5 (Vertex)** | — | Always managed/batched for volume |

> **Rule of thumb:** Agentic/tool-use → start on Claude (Haiku → Sonnet → Opus by difficulty).
> Bulk/multimodal → start on the cheapest capable model (Fable 5 / Gemini / Mistral) and escalate only
> if quality falls short. **Prompt caching** on the stable system context cuts cost on every path.

```typescript
// src/lib/ai/types.ts
export type TaskType = 
  | 'fast-text'      // Simple text: summaries, translations, classification
  | 'fast-vision'    // Simple image: OCR, image tagging, receipt parsing
  | 'emotion'        // Emotion analysis, sentiment, human understanding
  | 'copy-review'    // Text editing, proofreading, copywriting
  | 'logic'          // Complex reasoning, code generation, architecture
  | 'design'         // UI/UX design decisions, layout, component structure
  | 'embedding'      // Search indexing, similarity, clustering
  | 'batch';         // High-volume processing

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'vertex';
  model: string;
  temperature: number;
  maxTokens: number;
}
```

```typescript
// src/lib/ai/orchestrator.ts
export class AIOrchestrator {
  private adapters: Map<string, ProviderAdapter>;
  
  constructor() {
    this.adapters = new Map([
      ['google', new GoogleAdapter(process.env.GOOGLE_AI_API_KEY!)],    // Default
      ['openai', new OpenAIAdapter(process.env.OPENAI_API_KEY!)],       // Escalation
      ['anthropic', new AnthropicAdapter(process.env.ANTHROPIC_API_KEY!)], // Escalation
      ['mistral', new MistralAdapter(process.env.MISTRAL_API_KEY!)],    // Vision fallback
      ['vertex', new VertexAdapter(process.env.GOOGLE_CLOUD_PROJECT!)], // Batch/embed
    ]);
  }
  
  // Default routing: Gemini-first
  private static readonly MODEL_ROUTING: Record<TaskType, ModelConfig> = {
    'fast-text':    { provider: 'google',    model: 'gemini-2.0-flash',    temperature: 0.7, maxTokens: 1000 },
    'fast-vision':  { provider: 'google',    model: 'gemini-2.0-flash',    temperature: 0.3, maxTokens: 2000 },
    'emotion':      { provider: 'google',    model: 'gemini-2.5-pro',     temperature: 0.6, maxTokens: 2000 },
    'copy-review':  { provider: 'google',    model: 'gemini-2.5-pro',     temperature: 0.4, maxTokens: 4000 },
    'logic':        { provider: 'google',    model: 'gemini-2.5-pro',     temperature: 0.2, maxTokens: 8000 },
    'design':       { provider: 'google',    model: 'gemini-2.5-pro',     temperature: 0.3, maxTokens: 4000 },
    'embedding':    { provider: 'vertex',    model: 'text-embedding-005', temperature: 0,   maxTokens: 0 },
    'batch':        { provider: 'vertex',    model: 'gemini-2.0-flash',   temperature: 0.3, maxTokens: 2000 },
  };

  // Escalation overrides (set per-project in agents-project.json)
  private static readonly ESCALATION: Partial<Record<TaskType, ModelConfig>> = {
    'emotion':      { provider: 'openai',    model: 'gpt-5',           temperature: 0.6, maxTokens: 2000 },
    'copy-review':  { provider: 'openai',    model: 'gpt-4o',          temperature: 0.4, maxTokens: 4000 },
    'logic':        { provider: 'anthropic', model: 'claude-sonnet-4', temperature: 0.2, maxTokens: 8000 },
    'design':       { provider: 'anthropic', model: 'claude-sonnet-4', temperature: 0.3, maxTokens: 4000 },
  };
  
  async complete(request: {
    prompt: string;
    context?: string;
    taskType: TaskType;
    budget?: { max: number; current: number };
  }): Promise<CompletionResponse> {
    
    // 1. Select model by task type
    const modelConfig = this.selectModel(request.taskType, request.budget);
    
    // 2. Assemble messages
    const messages = this.assembleMessages(request.prompt, request.context);
    
    // 3. Get adapter
    const adapter = this.adapters.get(modelConfig.provider);
    if (!adapter) throw new Error(`Provider ${modelConfig.provider} not configured`);
    
    // 4. Execute with retries + provider fallback
    const response = await this.executeWithRetry(adapter, {
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
    });
    
    // 5. Log call
    await this.logCall({
      provider: modelConfig.provider,
      model: modelConfig.model,
      taskType: request.taskType,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      latencyMs: response.latencyMs,
      cost: this.calculateCost(modelConfig.model, response.usage),
    });
    
    // 6. Check budget
    await this.checkBudget(request.budget);
    
    return response;
  }
  
  private selectModel(
    taskType: TaskType,
    budget?: { max: number; current: number }
  ): ModelConfig {
    const config = AIOrchestrator.MODEL_ROUTING[taskType];
    
    // Budget-aware downgrade: if >80% spent, use cheapest model
    if (budget && (budget.current / budget.max) > 0.8) {
      return { provider: 'google', model: 'gemini-2.0-flash', temperature: 0.7, maxTokens: 1000 };
    }
    
    return config;
  }
  
  private async executeWithRetry(
    adapter: ProviderAdapter,
    request: CompletionRequest,
    maxRetries = 3
  ): Promise<CompletionResponse> {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await adapter.complete(request);
      } catch (error) {
        lastError = error;
        
        // Exponential backoff
        await this.sleep(Math.pow(2, i) * 1000);
        
        // Try fallback provider on last retry
        if (i === maxRetries - 1) {
          return await this.fallback(request);
        }
      }
    }
    
    throw lastError;
  }
  
  private async fallback(request: CompletionRequest): Promise<CompletionResponse> {
    // Primary was OpenAI → try Anthropic
    // Primary was Anthropic → try Google
    // etc.
    
    const fallbackAdapter = this.adapters.get('anthropic');
    if (!fallbackAdapter) throw new Error('No fallback available');
    
    return await fallbackAdapter.complete({
      ...request,
      model: 'claude-sonnet-4.5', // map to equivalent model
    });
  }
}
```

### Retry Strategy

- **Exponential backoff:** 1s, 2s, 4s
- **Max retries:** 3
- **Fallback:** On final retry, try secondary provider
- **Errors to retry:** Rate limits, timeouts, 5xx errors
- **Errors NOT to retry:** Auth failures, invalid requests

---

## ADK (Google AI Development Kit) Readiness

### What is ADK?

Google's framework for building AI agents with:
- **Agent definitions** (JSON schemas)
- **Tool declarations** (functions agents can call)
- **Prompt templates** (reusable prompts)
- **Eval frameworks** (quality measurement)

### ADK Integration Pattern

```typescript
// project/ai-agents/junia-agent.json (ADK schema)
{
  "name": "junia",
  "description": "Planning & Orchestration agent for sprint management",
  "model": "gemini-2.5-pro",
  "temperature": 0.2,
  "systemPrompt": "You are Junia, the Planning & Orchestration agent. You plan sprints, sequence tasks, and consolidate reports.",
  "tools": [
    {
      "name": "readRoadmap",
      "description": "Read the project ROADMAP to understand upcoming work",
      "parameters": {
        "type": "object",
        "properties": {
          "platform": { "type": "string", "enum": ["web", "mobile"] }
        },
        "required": ["platform"]
      }
    },
    {
      "name": "createSprintTask",
      "description": "Create a new sprint task file",
      "parameters": {
        "type": "object",
        "properties": {
          "sprintNumber": { "type": "string" },
          "sequence": { "type": "string" },
          "agent": { "type": "string" },
          "title": { "type": "string" }
        },
        "required": ["sprintNumber", "sequence", "agent", "title"]
      }
    }
  ],
  "entryFiles": [
    "docs/METHOD/agents-method.md",
    "docs/METHOD/sprints-method.md",
    "docs/project/ROADMAP.web.md"
  ]
}
```

**Usage in app:**

```typescript
// src/lib/ai/adk-loader.ts
import { loadAgent } from '@google/generative-ai/adk';

export async function loadJuniaAgent() {
  return await loadAgent('project/ai-agents/junia-agent.json');
}

// In API route or server action:
const juniaAgent = await loadJuniaAgent();
const result = await juniaAgent.execute({
  prompt: 'Plan sprint 016 for user dashboard improvements',
  tools: {
    readRoadmap: async ({ platform }) => {
      return await fs.readFile(`docs/project/ROADMAP.${platform}.md`, 'utf-8');
    },
    createSprintTask: async (params) => {
      // Create task file logic
    },
  },
});
```

### Benefits of ADK

✅ Declarative agent definitions  
✅ Tool declarations (Firebase, GitHub, custom)  
✅ Prompt versioning (track changes)  
✅ Built-in evals  
✅ Multi-agent orchestration primitives

---

## A2A (Agent-to-Agent) Protocol

### When to Use A2A

Use A2A when a task requires **multiple specialized agents in sequence** — each agent's output feeds the next. This is more powerful than calling one model with a complex prompt.

### Good A2A Patterns

✅ **Pipeline** — Chain agents: `extract → analyze → generate`  
✅ **Review loop** — Draft → Review → Revise  
✅ **Multimodal chain** — Vision agent (OCR) → Text agent (categorize) → Report agent (summarize)

### Bad A2A Patterns

❌ **Single-step tasks** — Use direct orchestrator call  
❌ **Latency-critical** — Each hop adds 1-3s  
❌ **Simple transformations** — Use code, not agents

### A2A Pipeline Pattern

```typescript
// src/lib/ai/a2a-pipeline.ts
import { AIOrchestrator, TaskType } from './orchestrator';

interface PipelineStep {
  name: string;
  taskType: TaskType;
  promptTemplate: string;  // Use {prev.output} for previous step's result
  context?: string;
}

export class A2APipeline {
  private orchestrator: AIOrchestrator;
  
  constructor(orchestrator: AIOrchestrator) {
    this.orchestrator = orchestrator;
  }
  
  async execute(steps: PipelineStep[], initialInput: string): Promise<string> {
    let currentInput = initialInput;
    const results: Record<string, string> = {};
    
    for (const step of steps) {
      const prompt = step.promptTemplate.replace('{prev.output}', currentInput);
      
      const response = await this.orchestrator.complete({
        prompt,
        context: step.context,
        taskType: step.taskType,
      });
      
      results[step.name] = response.content;
      currentInput = response.content;
    }
    
    return currentInput; // Final output
  }
}
```

### Usage Example: Receipt Processing

```typescript
const receiptPipeline = new A2APipeline(orchestrator);

const result = await receiptPipeline.execute([
  {
    name: 'extract',
    taskType: 'fast-vision',  // Mistral Pixtral
    promptTemplate: 'Extract all line items, amounts, and totals from this receipt image.',
    context: receiptImageBase64,
  },
  {
    name: 'categorize',
    taskType: 'fast-text',    // Gemini Flash
    promptTemplate: 'Categorize each expense from this receipt data: {prev.output}',
  },
  {
    name: 'report',
    taskType: 'copy-review',  // GPT-4o
    promptTemplate: 'Generate a professional expense report summary from: {prev.output}',
  },
], receiptImageBase64);
```

---

## Vertex AI Integration

### When to Use Vertex AI (vs Direct API)

| Use Case | Direct API | Vertex AI |
|----------|-----------|-----------|
| Single completions | ✅ Best | Overkill |
| Embeddings at scale | ❌ Expensive | ✅ Batch pricing |
| Batch predictions | ❌ Sequential | ✅ Parallel, managed |
| Model Garden (specialized) | ❌ Limited | ✅ Full access |
| SLA requirements | ❌ Best-effort | ✅ Enterprise SLA |

### Vertex Adapter

```typescript
// src/lib/ai/adapters/vertex.ts
import { VertexAI } from '@google-cloud/vertexai';

export class VertexAdapter implements ProviderAdapter {
  name = 'vertex' as const;
  private vertex: VertexAI;
  
  constructor(projectId: string, location = 'us-central1') {
    this.vertex = new VertexAI({ project: projectId, location });
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = this.vertex.getGenerativeModel({ model: request.model });
    const startTime = Date.now();
    
    const result = await model.generateContent({
      contents: request.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
    });
    
    const response = result.response;
    return {
      content: response.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      finishReason: 'stop',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
      latencyMs: Date.now() - startTime,
    };
  }
  
  // Embedding support (Vertex-specific)
  async embed(texts: string[]): Promise<number[][]> {
    const model = this.vertex.getGenerativeModel({ model: 'text-embedding-005' });
    const results = await Promise.all(
      texts.map(text => model.generateContent({ contents: [{ role: 'user', parts: [{ text }] }] }))
    );
    // Return embedding vectors
    return results.map(r => r.response.candidates?.[0]?.content?.parts?.[0]?.text as unknown as number[]);
  }
  
  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> { /* ... */ }
}
```

### Environment Setup

```bash
# .env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# Or use workload identity federation in Cloud Run
```

---

## MCP (Model Context Protocol) Readiness

### What is MCP?

Protocol for sharing context between AI agents:
- **MCP servers** expose context (Firestore data, GitHub repos, Figma designs)
- **MCP clients** (agents) consume context
- **Standardized format** (JSON-RPC 2.0)

### MCP Server Example

```typescript
// src/mcp-servers/firebase-server.ts
import { MCPServer } from '@modelcontextprotocol/sdk';

const server = new MCPServer({
  name: 'firebase-context',
  version: '1.0.0',
});

// Expose tenant-scoped Firestore collections as MCP resources
// Note: MCP server must enforce auth + membership checks before serving tenant data.
server.resource('teamMembers', async (params: { teamId: string }) => {
  const snapshot = await firestore.collection(`teams/${params.teamId}/members`).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

server.resource('teamInvoices', async (params: { teamId: string }) => {
  const snapshot = await firestore.collection(`teams/${params.teamId}/invoices`).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

// Expose as tool for agents (tenant-aware)
server.tool(
  'createInvoice',
  async (params: { teamId: string; amount: number; clientId: string }) => {
    const docRef = await firestore.collection(`teams/${params.teamId}/invoices`).add({
      amount: params.amount,
      clientId: params.clientId,
      createdAt: Date.now(),
    });

    return { invoiceId: docRef.id };
  }
);

server.listen(3001); // MCP server on port 3001
```

### MCP Client (Agent)

```typescript
// src/lib/ai/mcp-client.ts
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient('http://localhost:3001');

// Agent can now access tenant-scoped Firestore via MCP
const teamMembers = await client.getResource('teamMembers', { teamId });
const invoices = await client.getResource('teamInvoices', { teamId });

// Agent can call tools
const result = await client.callTool('createInvoice', {
  teamId,
  amount: 1500,
  clientId: 'client-123',
});
```

### Benefits of MCP

✅ Standardized context sharing  
✅ Agents don't need direct Firestore access  
✅ Security layer (MCP server controls access)  
✅ Reusable across agents

---

## Observability & Logging

### What to Log

For every LLM call, log:

```typescript
{
  timestamp: Date.now(),
  provider: 'openai', // or 'anthropic', 'google'
  model: 'gpt-5',
  agent: 'Brian', // METHOD agent (if applicable)
  task: 'sprint 015-a', // sprint task (if applicable)
  
  // Request
  promptTokens: 1250,
  
  // Response
  completionTokens: 850,
  totalTokens: 2100,
  
  // Performance
  latencyMs: 3240,
  
  // Cost (calculated)
  cost: 0.042, // USD
  
  // Outcome
  finishReason: 'stop', // or 'length', 'error'
  error: null, // or error message
  
  // Context
  userId: 'user-123', // if user-facing feature
  sessionId: 'session-456',
}
```

**Store in:** Firestore collection `llm_logs` or Cloud Logging

### Log Queries

```typescript
// Get cost for last 7 days
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const snapshot = await firestore
  .collection('llm_logs')
  .where('timestamp', '>=', sevenDaysAgo)
  .get();

const totalCost = snapshot.docs.reduce((sum, doc) => sum + doc.data().cost, 0);
console.log(`Last 7 days cost: $${totalCost.toFixed(2)}`);

// Get average latency by model
const latencies = {};
snapshot.docs.forEach(doc => {
  const { model, latencyMs } = doc.data();
  if (!latencies[model]) latencies[model] = [];
  latencies[model].push(latencyMs);
});

Object.entries(latencies).forEach(([model, values]) => {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  console.log(`${model}: ${avg.toFixed(0)}ms`);
});
```

---

## Cost Controls

### Budget Guardrails

```typescript
// src/lib/ai/budget.ts
export class BudgetManager {
  private db: FirebaseFirestore.Firestore;
  
  async checkBudget(userId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const budgetDoc = await this.db.collection('budgets').doc(userId).get();
    const { max, current } = budgetDoc.data() ?? { max: 50, current: 0 };
    
    return {
      allowed: current < max,
      current,
      max,
    };
  }
  
  async incrementBudget(userId: string, cost: number): Promise<void> {
    await this.db.collection('budgets').doc(userId).update({
      current: FirebaseFirestore.FieldValue.increment(cost),
    });
  }
  
  async resetBudget(userId: string): Promise<void> {
    // Run monthly via Cloud Scheduler
    await this.db.collection('budgets').doc(userId).update({ current: 0 });
  }
}

// In orchestrator:
const budget = await budgetManager.checkBudget(userId);
if (!budget.allowed) {
  throw new Error(`Budget exceeded: $${budget.current}/$${budget.max}`);
}

// After call:
await budgetManager.incrementBudget(userId, response.cost);
```

### Cost Calculation

```typescript
// Pricing (as of 2025-11, adjust as needed)
const PRICING = {
  'gpt-5': { prompt: 0.00002, completion: 0.00006 }, // per token
  'gpt-4o': { prompt: 0.000005, completion: 0.000015 },
  'claude-sonnet-4': { prompt: 0.000003, completion: 0.000015 },
  'claude-opus-4': { prompt: 0.000015, completion: 0.000075 },
  'gemini-2.5-pro': { prompt: 0.000001, completion: 0.000003 },
  'gemini-2.0-flash': { prompt: 0.0000001, completion: 0.0000003 },
  'mistral-large': { prompt: 0.000002, completion: 0.000006 },
  'pixtral-large': { prompt: 0.000002, completion: 0.000006 },
};

export function calculateCost(model: string, usage: Usage): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  
  return (
    usage.promptTokens * pricing.prompt +
    usage.completionTokens * pricing.completion
  );
}
```

### Budget Alerts

```typescript
// Cloud Function: check budgets daily
export const checkBudgets = functions.pubsub
  .schedule('every day 00:00')
  .onRun(async () => {
    const snapshot = await admin.firestore().collection('budgets').get();
    
    for (const doc of snapshot.docs) {
      const { current, max, email } = doc.data();
      
      // Alert at 80%
      if (current / max > 0.8) {
        await sendEmail({
          to: email,
          subject: 'AI Budget Alert',
          body: `You've used $${current.toFixed(2)} of your $${max} budget (${((current / max) * 100).toFixed(0)}%)`,
        });
      }
      
      // Block at 100%
      if (current >= max) {
        console.log(`Budget exceeded for user ${doc.id}`);
        // Subsequent calls will be blocked by checkBudget()
      }
    }
  });
```

---

## Evals (Quality Measurement)

### What are Evals?

Automated tests for LLM output quality:
- **Correctness:** Does the output match expected result?
- **Relevance:** Is the response on-topic?
- **Safety:** No harmful/biased content?
- **Consistency:** Same input → same output (within reason)?

### Eval Example

```typescript
// tests/evals/invoice-summary.eval.ts
import { describe, it, expect } from 'vitest';

describe('Invoice Summary Generation', () => {
  it('should generate accurate summary', async () => {
    const invoiceData = {
      items: [
        { name: 'Consulting', amount: 1000 },
        { name: 'Development', amount: 2000 },
      ],
      tax: 450,
      total: 3450,
    };
    
    const response = await orchestrator.complete({
      prompt: 'Generate a 1-sentence summary of this invoice',
      context: JSON.stringify(invoiceData),
      complexity: 'simple',
    });
    
    // Eval checks
    expect(response.content).toContain('3450'); // total must appear
    expect(response.content).toContain('Consulting'); // item must appear
    expect(response.content.length).toBeLessThan(200); // concise
  });
  
  it('should handle edge cases', async () => {
    const invoiceData = { items: [], tax: 0, total: 0 };
    
    const response = await orchestrator.complete({
      prompt: 'Generate a 1-sentence summary of this invoice',
      context: JSON.stringify(invoiceData),
      complexity: 'simple',
    });
    
    expect(response.content).toContain('empty'); // or 'no items'
  });
});
```

**Run evals in CI:**
```bash
npm run test:evals
```

---

## Project-Level AI Configuration

### agents-project.json Example

```json
{
  "routing": "task-type",
  "agents": [
    {
      "name": "Junia",
      "role": "Planning & Orchestration",
      "defaultTaskType": "logic",
      "entryFiles": [
        "docs/METHOD/agents-method.md",
        "docs/METHOD/sprints-method.md",
        "docs/project/"
      ],
      "tools": ["readRoadmap", "createSprintTask", "updateStatus"]
    },
    {
      "name": "Brian",
      "role": "Web Development",
      "defaultTaskType": "logic",
      "entryFiles": [
        "docs/METHOD/method-core.md",
        "docs/project/DESIGN.md"
      ],
      "tools": ["readFile", "writeFile", "runTests"]
    },
    {
      "name": "Riley",
      "role": "API & AI Engineer",
      "defaultTaskType": "logic",
      "entryFiles": [
        "docs/METHOD/ai-infra-method.md",
        "docs/project/AI-INFRA.md"
      ],
      "tools": ["configureADK", "setupMCP", "runEvals", "setupA2A"]
    }
  ],
  "escalationOverrides": {
    "emotion": { "provider": "openai", "model": "gpt-5", "enabled": false },
    "copy-review": { "provider": "openai", "model": "gpt-4o", "enabled": false },
    "logic": { "provider": "anthropic", "model": "claude-sonnet-4", "enabled": false },
    "design": { "provider": "anthropic", "model": "claude-sonnet-4", "enabled": false },
    "fast-vision": { "provider": "mistral", "model": "pixtral-large", "enabled": false }
  },
  "budget": {
    "monthly": 50,
    "alertThreshold": 0.8
  },
  "observability": {
    "logDestination": "firestore",
    "collection": "llm_logs",
    "enableCostTracking": true,
    "enableLatencyTracking": true
  },
  "evals": {
    "enabled": true,
    "runOn": ["ci", "staging"],
    "failOn": ["correctness", "safety"]
  }
}
```

**Store in:** `docs/project/agents-project.json` (or inline in AI-INFRA.md)

---

## Designing AI-Native Apps

### Philosophy

Most apps built with METHOD are **AI-native** — AI isn't a bolt-on feature, it's a core collaboration layer. The architecture must support:

1. **Multi-agent integration** — Multiple AI agents working within the app (not just one chatbot)
2. **Configurable routing** — Users/admins can adjust which model handles which task
3. **Observable AI** — Every AI call is logged, budgeted, and auditable
4. **Graceful degradation** — If AI is down or budget-exceeded, app still works

### App Architecture Pattern

```
┌─────────────────────────────────────────────┐
│  UI Layer (React / Next.js)                 │
│  Components call AI via hooks/actions       │
│  Settings page: AI provider config          │
└─────────────┬───────────────────────────────┘
              │ server action / API route
┌─────────────▼───────────────────────────────┐
│  AI Service Layer         (src/lib/ai/)     │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Orchestrator │  │ A2A Pipeline Engine │  │
│  │ (routing)    │  │ (multi-step flows)  │  │
│  └──────┬──────┘  └──────────┬───────────┘  │
│         │                    │              │
│  ┌──────▼────────────────────▼───────────┐  │
│  │ Provider Adapters                     │  │
│  │ Google │ OpenAI │ Anthropic │ Mistral │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │ Shared Services                       │  │
│  │ Budget │ Logging │ Vector Store       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Project-Level AI Settings

Every AI-native app should have a **Settings > AI** page that lets admins:
- View current provider/model per task type
- See usage and costs (from `llm_logs`)
- Adjust budget limits
- Enable/disable escalation (Gemini → GPT/Claude)
- View AI call history

Store config in Firestore: `teams/{teamId}/settings/ai`

---

## Vectorization & Embedding Strategy

### When to Vectorize

✅ **Semantic search** — Find documents by meaning, not keywords  
✅ **RAG (Retrieval-Augmented Generation)** — Feed context to LLMs  
✅ **Similarity matching** — Find similar invoices, products, clients  
✅ **Clustering** — Group related items automatically

❌ **Exact lookups** — Use Firestore queries  
❌ **Numeric filters** — Use SQL/Firestore  
❌ **Small datasets (<100 items)** — Not worth the overhead

### Recommended Stack

| Component | Recommended | Alternative |
|-----------|-------------|-------------|
| Embedding model | **Vertex AI `text-embedding-005`** | Gemini via direct API |
| Vector database | **Firestore Vector Search** | Pinecone, Weaviate |
| Chunking strategy | 512-token chunks with 50-token overlap | Adjust per content type |
| Index refresh | On write (real-time) or nightly batch | Depends on data velocity |

### Why Firestore Vector Search (default)

✅ Same database as app data — no sync needed  
✅ Tenant-scoped (`teams/{teamId}/embeddings/`)  
✅ Firestore rules apply — security built-in  
✅ No extra infra to manage  
⚠️ Limited to ~1M vectors per index (sufficient for most tenant apps)

### Implementation Pattern

```typescript
// src/lib/ai/vector.ts
import { VertexAdapter } from './adapters/vertex';

export class VectorService {
  private vertex: VertexAdapter;
  private db: FirebaseFirestore.Firestore;
  
  // Index a document
  async index(teamId: string, doc: { id: string; content: string; metadata?: Record<string, any> }) {
    const embedding = await this.vertex.embed([doc.content]);
    
    await this.db.collection(`teams/${teamId}/embeddings`).doc(doc.id).set({
      content: doc.content,
      embedding: FieldValue.vector(embedding[0]),
      metadata: doc.metadata ?? {},
      indexedAt: FieldValue.serverTimestamp(),
    });
  }
  
  // Semantic search
  async search(teamId: string, query: string, limit = 10): Promise<SearchResult[]> {
    const queryEmbedding = await this.vertex.embed([query]);
    
    const results = await this.db
      .collection(`teams/${teamId}/embeddings`)
      .findNearest({
        vectorField: 'embedding',
        queryVector: queryEmbedding[0],
        limit,
        distanceMeasure: 'COSINE',
      })
      .get();
    
    return results.docs.map(doc => ({
      id: doc.id,
      content: doc.data().content,
      score: doc.data().distance,
      metadata: doc.data().metadata,
    }));
  }
}
```

### Chunking Guide

| Content Type | Chunk Size | Overlap | Notes |
|-------------|-----------|---------|-------|
| Short text (names, labels) | No chunking | — | Embed whole |
| Paragraphs (descriptions) | 256 tokens | 25 tokens | Keep semantic units |
| Documents (invoices, reports) | 512 tokens | 50 tokens | Standard |
| Long documents (contracts) | 1024 tokens | 100 tokens | Preserve context |

---

## When to Use AI in Your App

### Good Use Cases

✅ **Content generation** — Summaries, descriptions, email templates  
✅ **Semantic search** — Find documents by meaning, not keywords  
✅ **Classification** — Tag invoices, categorize expenses  
✅ **Conversational UI** — Chatbots, assistants  
✅ **Data extraction** — Parse invoices, receipts (OCR + LLM)  
✅ **Recommendations** — Suggest products, next actions

### Bad Use Cases

❌ **Deterministic calculations** — Use code (taxes, totals, dates)  
❌ **High-stakes decisions** — Require human review (legal, medical)  
❌ **Real-time performance-critical** — LLMs have latency (200-5000ms)  
❌ **Perfect accuracy required** — LLMs can hallucinate  
❌ **Sensitive PII** — Don't send to external APIs without consent

### Decision Framework

```
Is it deterministic?
  → Yes: Use code (faster, cheaper, accurate)
  → No: Continue

Is latency critical (<100ms)?
  → Yes: Use code or cache results
  → No: Continue

Is perfect accuracy required?
  → Yes: Use code or add human review
  → No: Continue

Does it involve PII?
  → Yes: Anonymize or get consent
  → No: Continue

→ OK to use AI
```

---

## Process Execution Tracing

> See `process-method.md` for the full process architecture standard. This section covers the **technical implementation** of execution tracing in your app.

### ProcessRun Schema (Firestore)

Store traces in `teams/{teamId}/process_runs/{runId}`:

```typescript
// src/lib/process/types.ts
export interface ProcessRun {
  // Identity
  processId: string;        // "PROC-001"
  processName: string;      // "Quote Generation"
  runId: string;            // auto-generated
  
  // Context
  teamId: string;
  triggeredBy: 'user' | 'agent' | 'system' | 'schedule';
  triggeredByUserId?: string;
  triggeredByAgentId?: string;
  
  // Timing
  startedAt: Timestamp;
  completedAt?: Timestamp;
  durationMs?: number;
  
  // Result
  status: 'running' | 'success' | 'failure' | 'escalated' | 'cancelled';
  
  // Steps — canonical data in subcollection: process_runs/{runId}/steps/{stepNumber}
  // This field is NOT populated by the logger; query the subcollection for step details.
  
  // AI Metrics (aggregate)
  llmCalls: number;
  totalTokens: number;
  totalCost: number;
  
  // Quality Signals
  humanOverrideCount: number;
  qualityScore?: number;        // 0-1, evaluated post-run
  
  // Diagnostics
  errorMessage?: string;
  errorStep?: number;
  escalationReason?: string;
}

export interface ProcessStepRun {
  stepNumber: number;
  stepName: string;
  operator: 'human' | 'agent' | 'code';
  agentId?: string;
  
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  
  // If agent
  llmCalls?: number;
  tokensUsed?: number;
  costUsd?: number;           // step-level cost (calculated from tokens × pricing)
  
  // If human corrected
  humanOverride?: boolean;
  overrideReason?: string;
}
```

### Trace Logger Utility

> [!IMPORTANT]
> Process traces are **audit/governance data**. The logger must run in **trusted server code** (Cloud Functions, server actions) — never from the client SDK. Use the Firebase Admin SDK for writes.

```typescript
// src/lib/process/trace-logger.ts  (server-side only — Cloud Functions / server actions)
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { ProcessRun, ProcessStepRun } from './types';

export class ProcessTraceLogger {
  private db = getFirestore();
  private runRef: FirebaseFirestore.DocumentReference;
  private run: Partial<ProcessRun>;
  
  constructor(teamId: string, processId: string, processName: string, triggeredBy: ProcessRun['triggeredBy']) {
    this.runRef = this.db.collection(`teams/${teamId}/process_runs`).doc();
    this.run = {
      processId,
      processName,
      runId: this.runRef.id,
      teamId,
      triggeredBy,
      startedAt: Timestamp.now(),
      status: 'running',
      llmCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      humanOverrideCount: 0,
    };
  }
  
  async start(): Promise<string> {
    await this.runRef.set(this.run);
    return this.runRef.id;
  }
  
  /**
   * Log a completed step. Uses atomic FieldValue increments to prevent
   * lost updates when steps execute in parallel or across workers.
   */
  async logStep(step: ProcessStepRun): Promise<void> {
    // Write step to subcollection (no array overwrites)
    await this.runRef.collection('steps').doc(String(step.stepNumber)).set(step);
    
    // Atomically increment aggregate counters on the parent run
    const increments: Record<string, any> = {};
    if (step.llmCalls)      increments.llmCalls      = FieldValue.increment(step.llmCalls);
    if (step.tokensUsed)    increments.totalTokens   = FieldValue.increment(step.tokensUsed);
    if (step.costUsd)       increments.totalCost     = FieldValue.increment(step.costUsd);
    if (step.humanOverride) increments.humanOverrideCount = FieldValue.increment(1);
    
    if (Object.keys(increments).length > 0) {
      await this.runRef.update(increments);
    }
  }
  
  async complete(status: ProcessRun['status'], qualityScore?: number): Promise<void> {
    await this.runRef.update({
      status,
      completedAt: Timestamp.now(),
      durationMs: Date.now() - this.run.startedAt!.toMillis(),
      qualityScore,
    });
  }
  
  async fail(errorMessage: string, errorStep?: number): Promise<void> {
    await updateDoc(this.runRef, {
      status: 'failure',
      completedAt: Timestamp.now(),
      durationMs: Date.now() - this.run.startedAt!.toMillis(),
      errorMessage,
      errorStep,
    });
  }
}
```

### Usage Example

```typescript
// In a process handler (e.g., quote generation)
const tracer = new ProcessTraceLogger(teamId, 'PROC-001', 'Quote Generation', 'user');
const runId = await tracer.start();

try {
  // Step 1: Extract needs (agent)
  const needs = await extractNeeds(input);
  await tracer.logStep({
    stepNumber: 1, stepName: 'Extract needs', operator: 'agent', agentId: 'GHOSTWRITER',
    status: 'success', startedAt: Timestamp.now(), completedAt: Timestamp.now(),
    llmCalls: 1, tokensUsed: 450,
  });
  
  // Step 2: Calculate price (code)
  const price = calculatePrice(needs);
  await tracer.logStep({
    stepNumber: 2, stepName: 'Calculate price', operator: 'code',
    status: 'success', startedAt: Timestamp.now(), completedAt: Timestamp.now(),
  });
  
  await tracer.complete('success', 0.95);
} catch (error) {
  await tracer.fail(error.message, 1);
}
```

### Firestore Rules for Process Runs

```
match /teams/{teamId}/process_runs/{runId} {
  allow read: if isTeamMember(teamId);
  allow write: if isTeamAdmin(teamId);
  // Note: The ProcessTraceLogger runs server-side using Admin SDK,
  // which bypasses these rules entirely. Client-side writes are
  // restricted to team admins for manual overrides only.
}
```

---

## Security Best Practices

1. **API keys in environment variables** — Never commit to git
2. **Validate inputs** — Sanitize user prompts (prevent injection)
3. **Rate limiting** — Prevent abuse (per-user, per-IP)
4. **Output validation** — Check LLM responses before displaying
5. **Budget caps** — Prevent runaway costs
6. **Audit logs** — Track who called what, when
7. **Content filtering** — Block harmful outputs (use provider safety tools)
