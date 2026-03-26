# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in CrowByte Terminal, please report it responsibly.

**Email**: security@hlsitech.io

Do NOT open a public GitHub issue for security vulnerabilities.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Security Measures

- E2E AES-256-GCM encryption for remote sessions
- ECDH P-256 key exchange with perfect forward secrecy
- TLS 1.3 for all connections
- Row Level Security on all database tables
- Content Security Policy enforcement
- No plaintext credential storage
- Full audit trail for remote access sessions
