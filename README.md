# 🦛 Hippo

**Agent reliability infrastructure for Vercel AI SDK.**

Trace. Regress. Gate. The CI/CD layer for AI agent behavior.

[![npm](https://img.shields.io/npm/v/hippo-reasoning)](https://www.npmjs.com/package/hippo-reasoning)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/darthyoda69/hippo-reasoning)

---

## Try it (60 seconds)

1. Open **[hippo-reasoning.vercel.app](https://hippo-reasoning.vercel.app)**
2. Send any query to the research agent
3. Watch the **Trace** panel populate in real-time
4. Click **Save as regression** on the trace
5. Switch to **CI/CD** tab → click `$ hippo gate --run-all` → see **PASS/FAIL**

That's the full loop: **trace → test → gate.**

---

## The Problem

AI agents reason through tasks, make tool calls, produce outputs — then forget everything.

**Memory tools** (Mem0, Zep) store *facts* but don't capture *how the agent reasoned*. **Observability tools** (LangSmith, Langfuse) *trace* reasoning but are read-only dashboards the agent never sees.

**The gap:** No tool captures reasoning traces AND feeds them back as memory the agent can learn from.

Hippo fills that gap. It captures the full reasoning trace — every step, tool call, decision, and timing — stores it as structured memory, and injects relevant past reasoning into future tasks.

## Quick Start

```bash
npm install hippo-reasoning
```

3-line integration with Vercel AI SDK:

```typescript
import { HippoTracer } from 'hippo-reasoning';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const hippo = new HippoTracer({ sessionId: 'my-session' });

const result = hippo.trace(streamText, {
  model: anthropic('claude-sonnet-4-20250514'),
  messages,
  tools,
});
```

## What It Does

**Trace Capture** — Every agent interaction is captured as a structured reasoning trace: messages, tool calls, results, timestamps, and latency per step.

**Reasoning Memory** — Stored traces are retrieved and injected into the agent's context. Similar past reasoning improves future responses across sessions.

**Eval Framework** — Built-in 4-dimension scoring (relevance, completeness, reasoning quality, tool usage) comparing agent performance with vs without memory.

**Replay** — Re-execute any stored trace for step-by-step debugging with latency profiling and tool call inspection.

**Regression Gates (CI/CD)** — One click turns any trace into a regression test. Run all tests as a deploy gate with PASS/FAIL. Block deployments when agent behavior regresses.

## Demo

**[Live Demo →](https://hippo-reasoning.vercel.app)**

The demo app is a split-panel interface with 5 tabs:

| Panel | What it shows |
|-------|--------------|
| **Chat** | Research agent with tool calls. Supports Anthropic, OpenAI, and Google models. |
| **Trace** | Real-time reasoning visualization. Save any trace as a regression test. |
| **Memory** | Stored traces with similarity-ranked retrieval |
| **Diff** | Visual side-by-side trace comparison for debugging regressions |
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
# Optional — enable cross-model support:
# OPENAI_API_KEY=your-key-here
# GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

```bash
npm run dev
# → http://localhost:3000
```

## Architecture

```
hippo-reasoning/
├── lib/
│   ├── hippo.ts               # Core: TraceBuilder + MemoryStore + RegressionStore
│   ├── models.ts              # Cross-model provider abstraction
│   ├── similarity.ts          # TF-IDF cosine similarity (zero deps)
│   ├── memory-policy.ts       # Outcome-driven trace scoring & retention
│   ├── export.ts              # Dataset export (OpenAI/Anthropic JSONL, CSV)
│   ├── composable-memory.ts   # Mem0/Zep adapter interface
│   ├── plugins.ts             # Plugin system for custom trace processors
│   └── kv-store.ts            # Vercel KV persistent storage adapter
├── app/
│   ├── page.tsx               # Split-panel demo (5 tabs)
│   └── api/                   # Chat, traces, eval, export, regressions
└── components/                # ChatPanel, TracePanel, MemoryPanel, DiffPanel, EvalPanel, RegressionPanel
```

## API Reference

### Core Library

| Class | Key Methods |
|-------|-------------|
| `TraceBuilder` | `new TraceBuilder(traceId, sessionId, query)`, `.addStep(type, content, metadata?)`, `.complete(summary?)` |
| `MemoryStore` | `.store(trace)`, `.get(traceId)`, `.getBySession(sessionId)`, `.getReasoningContext(query, sessionId)`, `.getStats()` |

**Step types:** `user_message` · `assistant_message` · `tool_call` · `tool_result` · `reasoning`

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with agent, returns stream + trace ID |
| `/api/traces` | GET/DELETE | Get or clear stored traces |
| `/api/eval` | POST | Run with/without memory eval |
| `/api/regressions` | GET/POST/DELETE | Regression tests + deploy gate |
| `/api/export?format=X` | GET | Export as openai_jsonl, anthropic_jsonl, csv, json |

## Benchmarks

Benchmarks vary per session — chat 3–5 times to build memory, then use the **Eval** tab to see the delta across relevance, completeness, reasoning quality, and tool usage dimensions.

| Metric | Value |
|--------|-------|
| Tracing overhead per step | ~2ms |
| Average trace size | ~1.2 KB |

## How It Compares

**Memory tools** (Mem0, Zep) store *facts*. **Observability tools** (LangSmith, Langfuse) *trace* reasoning. **Hippo bridges the gap** — it captures traces like observability, retrieves them like memory, and gates deployments like CI/CD.

| Tool | Category | Deploy Gate | Stores Reasoning | Trace Replay | Built-in Eval | Vercel AI SDK Native |
|------|----------|:-:|:-:|:-:|:-:|:-:|
| Mem0 | Memory | ❌ | ❌ | ❌ | ❌ | ❌ |
| Zep | Memory | ❌ | ❌ | ❌ | ❌ | ❌ |
| LangMem | Memory | ❌ | ❌ | ❌ | ❌ | ❌ |
| Letta/MemGPT | Memory | ❌ | ❌ | ❌ | ❌ | ❌ |
| LangSmith | Observability | ❌ | traces only | ❌ | ✅ | ❌ |
| Langfuse | Observability | ❌ | traces only | ❌ | ✅ | ❌ |
| **Hippo** | **Agent CI/CD** | **✅** | **✅** | **✅** | **✅** | **✅** |

## Tech Stack

- **Next.js 15** — App Router
- **Vercel AI SDK v4** — `streamText`, `generateText`, `tool`, `useChat`
- **Anthropic Claude** — via `@ai-sdk/anthropic` (default)
- **OpenAI GPT-4o** — via `@ai-sdk/openai` (optional)
- **Google Gemini** — via `@ai-sdk/google` (optional)
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
- [x] Cross-model memory (OpenAI, Google, etc.)
- [x] Trace similarity search for smarter retrieval
- [x] Outcome-driven memory policies
- [x] Visual trace diff for debugging regressions
- [x] Export traces as datasets for fine-tuning
- [x] Composable memory: combine Hippo reasoning traces with Mem0/Zep fact memory
- [x] Plugin system for custom trace processors
- [x] Persistent storage via Vercel KV (Upstash Redis)
- [x] `hippo gate` CLI command for CI pipelines

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on the development workflow, code standards, and how to submit pull requests.

## Security

To report a vulnerability, please see our [Security Policy](SECURITY.md).

## License

MIT

---

Built by [Leon Benz](https://www.linkedin.com/in/leonbenz/)
