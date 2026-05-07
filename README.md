# GenoSync

### Secure Genomic Data Synchronization Platform

> Decentralized, privacy-preserving genomic data sharing for researchers and healthcare providers. Built with blockchain attestation, zero-knowledge proofs, and secure multi-party computation.

GenoSync enables secure collaboration on genomic datasets while maintaining patient privacy and data sovereignty. Researchers can verify data integrity, share insights, and maintain immutable audit trails without exposing sensitive genetic information.

**Core Principle:** Your genomic data belongs to you. Control who accesses it, when, and for what purpose — with cryptographic guarantees.

---

## Features

| Capability | Description | Technology |
|---|---|---|
| **Zero-Knowledge Sharing** | Share genomic insights without exposing raw data | zk-SNARKs, secure enclaves |
| **Blockchain Attestation** | Immutable provenance and audit trails | Flow EVM, IPFS |
| **Multi-Party Computation** | Collaborative analysis without centralizing data | MPC protocols |
| **Data Sovereignty** | Patient-controlled access permissions | Smart contracts |
| **Encrypted Storage** | At-rest and in-transit encryption | AES-256, TLS 1.3 |
| **Research Governance** | Institutional review and compliance workflows | RBAC, workflow engine |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development servers
pnpm --filter @genosync/api run dev    # Backend API
pnpm --filter @genosync/web run dev  # Frontend
```

Visit `http://localhost:5173` to access the platform.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GenoSync Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Web App    │◄──►│   API Gateway│◄──►│  Services    │     │
│  │  (React 19)  │    │   (Express)  │    │              │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  ZK Circuits │    │   Blockchain │    │  Encrypted   │     │
│  │  (Noir)      │    │   (Flow EVM) │    │  Storage     │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4
- **Backend:** Express 5, PostgreSQL, Drizzle ORM
- **Cryptography:** Noir (zk-SNARKs), MPC libraries
- **Blockchain:** Flow EVM (chain 545), IPFS
- **Security:** AES-256 encryption, secure enclaves

## License

MIT License — see [LICENSE](LICENSE) for details.

