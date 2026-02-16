# Contributing to Hippo

Thanks for your interest in contributing to Hippo! This guide will help you get started.

## Development Setup
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
```

## Project Structure

- `lib/hippo.ts` — Core library: TraceBuilder, MemoryStore, RegressionStore, types
- `lib/kv-store.ts` — Vercel KV persistent storage adapter
- `app/api/` — API routes (chat, traces, eval, regressions)
- `components/` — React components (Chat, Trace, Memory, Diff, Eval, Regression panels)
- `bin/hippo.js` — CLI tool

## How to Contribute

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/my-feature`
3. **Make your changes** and test locally
4. **Commit** with a clear message: `git commit -m "Add: description of change"`
5. **Push** and open a Pull Request

## What We're Looking For

- Bug fixes and reliability improvements
- New trace processors or memory strategies
- Cross-model provider support
- Documentation improvements
- Performance optimizations

## Code Style

- TypeScript strict mode
- Functional components with hooks
- Descriptive variable names
- Keep functions focused and small

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
