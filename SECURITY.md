# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Email:** leonbenz@alumni.ie.edu

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅        |

## Security Practices

- All API keys are stored as environment variables, never in source code
- The `.gitignore` excludes `.env` and `.env*.local` files
- Vercel KV credentials are managed through Vercel's platform
- No user data is stored permanently in the demo — in-memory storage resets on restart
