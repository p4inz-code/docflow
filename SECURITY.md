# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | ✅ Active development |

## Reporting a Vulnerability

Docflow is a client-side PDF editor that processes documents entirely in the browser. No document data is transmitted over the network.

If you discover a security vulnerability, please report it by opening a [GitHub Issue](https://github.com/your-org/docflow/issues/new?template=bug_report.md) with the label `security`.

Please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)

We will acknowledge receipt within 48 hours and provide a timeline for the fix.

## Security Considerations

- Docflow runs entirely client-side — no document data leaves your machine
- PDFs are rendered via Mozilla's pdf.js in a sandboxed environment
- Images imported via clipboard or drag-drop are validated by MIME type
- No API keys, tokens, or secrets are stored
- All error messages in production builds are user-friendly with no stack traces
- The application uses Content Security Policy headers when running in Electron
