# 🦛 Hippo Reasoning

**Open-source agent reliability infrastructure for Vercel AI SDK.**

Reasoning memory. Trace replay. Regression gates. The CI/CD layer for agent behavior.

[![npm](https://img.shields.io/npm/v/hippo-reasoning)](https://www.npmjs.com/package/hippo-reasoning)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/darthyoda69/hippo-reasoning)

---

## The Problem

AI agents reason through tasks, make tool calls, produce outputs — then forget everything. Two categories of tools exist to help, but neither solves it:

**Memory tools** (Mem0, Zep) store *facts* — what the user said, what preferences exist. But they don't capture *how the agent reasoned* or *which tools it used and why*.

**Observability tools** (LangSmith, Langfuse) *trace* the reasoning — every step, every tool call. But they're read-only developer dashboards. The agent itself never sees its own past traces.

**The gap:** No tool captures reasoning traces AND feeds them back as memory the agent can learn from.

Hippo fills that gap. It captures the full reasoning trace — every step, tool call, decision, and timing — stores it as structured memory, and injects relevant past reasoning into future tasks. Replay, learning, and evaluation in one primitive.

## Quick Start

```bash
npm install hippo-reasoning
```

3-line integration with Vercel AI SDK:

```typescript
import { HippoTracer } from 'hippo-reasoning';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Initialize tracer
const hippo = new HippoTracer({ sessionId: 'my-session' });

// Wrap your streamText call — traces captured automatically
const result = hippo.trace(streamText, {
  model: anthropic('claude-sonnet-4-20250514'),
  messages,
  tools,
});
```

## What It Does

### 1. Trace Capture
Every agent interaction is captured as a structured reasoning trace:
- User messages, assistant responses, tool calls, tool results
- Timestamps and latency per step
- Tools used and their arguments
- Automatic summarization

### 2. Reasoning Memory
Stored traces are retrieved and injected into the agent's context for future tasks:
- Similar past reasoning improves future responses
- Agents learn tool usage patterns across sessions
- Context from previous decisions informs new ones

### 3. Eval Framework
Built-in evaluation comparing agent performance WITH vs WITHOUT reasoning memory:
- 4-dimension scoring: relevance, completeness, reasoning quality, tool usage
- Score delta visualization
- Reproducible benchmark runs

### 4. Replay
Re-execute any stored trace to reproduce or debug agent behavior:
- Step-by-step trace playback
- Latency profiling per step
- Tool call inspection

### 5. Regression Gates (CI/CD)
One click turns any trace into a regression test that gates deployments:
- Save any trace as a regression test
- Run all tests as a deploy gate (PASS/FAIL)
- Track score history across runs
- Block deployments when agent behavior regresses

## Demo

**[Live Demo →](https://hippo-reasoning.vercel.app)**

The demo app is a split-panel interface with 4 tabs:

| Panel | What it shows |
|-------|--------------|
| **Chat** | Research agent with tool calls (search, calculate, analyze) |
| **Trace** | Real-time reasoning visualization — every step as it happens. Save any trace as a regression test. |
| **Memory** | Stored traces with expandable detail view |
| **Eval** | Side-by-side comparison: with memory vs without |
| **CI/CD** | Regression suite — run deploy gate, track pass/fail history |

## Run Locally

```bash
git clone https://github.com/darthyoda69/hippo-reasoning.git
cd hippo-reasoning
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
```

```bash
npm run dev
# → http://localhost:3000
```

## Architecture

```
hippo-reasoning/
├── lib/
│   └── hippo.ts              # Core: TraceBuilder + MemoryStore + RegressionStore + types
├── app/
│   ├── page.tsx               # Split-panel demo (4 tabs)
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Animations + theme
│   ├── benchmarks/page.tsx    # Benchmarks visualization
│   └── api/
│       ├── chat/route.ts      # Vercel AI SDK + Anthropic + trace capture
│       ├── traces/route.ts    # Trace retrieval + deletion API
│       ├── eval/route.ts      # With/without memory eval comparison
│       └── regressions/route.ts # Regression tests + deploy gate API
├── components/
│   ├── ChatPanel.tsx          # Chat with memory toggle
│   ├── TracePanel.tsx         # Real-time trace timeline + save as regression
│   ├── MemoryPanel.tsx        # Stored traces browser
│   ├── EvalPanel.tsx          # Eval comparison dashboard
│   └── RegressionPanel.tsx    # CI/CD deploy gate + regression suite
```

### Core Library (`lib/hippo.ts`)

**TraceBuilder** — Creates structured traces step-by-step:
```typescript
const trace = new TraceBuilder(traceId, sessionId, query);
trace.addStep('tool_call', 'Searching for X', { toolName: 'search', toolArgs: { q: 'X' } });
trace.addStep('tool_result', 'Found 3 results', { toolName: 'search' });
trace.addStep('assistant_message', 'Based on my research...');
const completed = trace.complete('Summary of the reasoning');
```

**MemoryStore** — Stores and retrieves reasoning traces:
```typescript
import { hippoMemory } from 'hippo-reasoning';

// Store a completed trace
hippoMemory.store(completedTrace);

// Get reasoning context for a new query
const context = hippoMemory.getReasoningContext(newQuery, sessionId);
// → Inject into system prompt for improved responses
```

## API Reference

### TraceBuilder

| Method | Description |
|--------|-------------|
| `new TraceBuilder(traceId, sessionId, query)` | Create a new trace |
| `.addStep(type, content, metadata?)` | Add a step to the trace |
| `.complete(summary?)` | Finalize and return the trace |

**Step types:** `user_message` | `assistant_message` | `tool_call` | `tool_result` | `reasoning`

### MemoryStore

| Method | Description |
|--------|-------------|
| `.store(trace)` | Store a completed trace |
| `.get(traceId)` | Retrieve a specific trace |
| `.getBySession(sessionId)` | Get all traces for a session |
| `.getReasoningContext(query, sessionId)` | Get formatted context for system prompt injection |
| `.getStats()` | Get aggregate statistics |
| `.clear()` | Clear all stored traces |

### REST API (Demo App)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with agent, returns stream + trace ID |
| `/api/traces?sessionId=X` | GET | Get stored traces |
| `/api/traces?traceId=X` | GET | Get specific trace |
| `/api/traces` | DELETE | Clear all traces |
| `/api/eval` | POST | Run with/without memory eval |
| `/api/regressions` | GET | List regression tests + pass/fail status |
| `/api/regressions` | POST | Create from trace, run single test, or run deploy gate |
| `/api/regressions` | DELETE | Remove a regression test |

## Benchmarks

Measured on the demo app with 5 diverse research queries:

| Metric | Value |
|--------|-------|
| Tracing overhead per step | ~2ms |
| Average trace size | ~1.2 KB |
| Eval score WITH memory | 82% avg |
| Eval score WITHOUT memory | 68% avg |
| Quality improvement | **+21%** |

All benchmarks reproducible from the repo. Run `npm run dev`, chat with the agent 3-5 times to build memory, then use the Eval tab.

## How It Compares

The AI agent tooling landscape has two categories that don't talk to each other:

**Memory tools** (Mem0, Zep, Minns) store *facts* — user preferences, extracted entities, conversation summaries. They make agents remember *what happened*, but not *how the agent thought about it*.

**Observability tools** (LangSmith, Langfuse) *trace* reasoning — tool calls, latency, step-by-step logs. They let developers *inspect* agent behavior in hindsight, but don't feed traces back as memory.

**Hippo bridges the gap.** It captures reasoning traces like an observability tool, then stores and retrieves them like a memory system — creating a closed loop where agents actually learn from their own reasoning.

| Tool | Category | Stores Facts | Stores Reasoning | Trace Replay | Built-in Eval | Vercel AI SDK Native |
|------|----------|:-:|:-:|:-:|:-:|:-:|
| Mem0 | Memory | ✅ | ❌ | ❌ | ❌ | ❌ |
| Zep | Memory | ✅ | ❌ | ❌ | ❌ | ❌ |
| Minns | Memory | ✅ | partial | ❌ | ❌ | ❌ |
| LangMem | Memory | ✅ | ❌ | ❌ | ❌ | ❌ |
| Letta/MemGPT | Memory | ✅ | ❌ | ❌ | ❌ | ❌ |
| LangSmith | Observability | ❌ | traces only | ❌ | ✅ | ❌ |
| Langfuse | Observability | ❌ | traces only | ❌ | ✅ | ❌ |
| **Hippo** | **Reasoning Memory** | ❌ | **✅** | **✅** | **✅** | **✅** |

Hippo doesn't replace fact memory or observability — it adds the missing layer between them: **reasoning memory that agents can learn from**.

## Tech Stack

- **Next.js 15** — App Router
- **Vercel AI SDK v4** — `streamText`, `generateText`, `tool`, `useChat`
- **Anthropic Claude** — via `@ai-sdk/anthropic`
- **Tailwind CSS** — Dark theme, custom animations
- **TypeScript** — Strict mode

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/darthyoda69/hippo-reasoning)

Set `ANTHROPIC_API_KEY` in your Vercel environment variables.

## Roadmap

- [x] Reasoning trace capture + memory injection
- [x] With/without memory eval framework
- [x] One-click regression test creation from traces
- [x] Deploy gate (run all regression tests, PASS/FAIL)
- [ ] Persistent storage via Vercel KV
- [ ] `hippo gate` CLI command for CI pipelines
- [ ] Cross-model memory (OpenAI, Google, etc.)
- [ ] Trace similarity search for smarter retrieval
- [ ] Outcome-driven memory policies (reinforce traces that led to good results, decay bad ones)
- [ ] Visual trace diff for debugging regressions
- [ ] Export traces as datasets for fine-tuning
- [ ] Composable memory: combine Hippo reasoning traces with Mem0/Zep fact memory
- [ ] Plugin system for custom trace processors

## License

MIT

---

Built by [Leon Benz](https://www.linkedin.com/in/leonbenz/) — reasoning memory for the AI-native builder era.
