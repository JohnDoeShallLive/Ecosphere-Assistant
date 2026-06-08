You are a Senior Product Manager + AI Systems Architect.

Your task is to create a complete Product Requirements Document (PRD) and MVP plan for the following project:

PROJECT NAME: EchoSphere

PROJECT CONTEXT:
EchoSphere is a privacy-first, local-first AI-powered digital memory assistant that captures, processes, and retrieves a user’s entire digital life (documents, browsing, notes, clipboard, apps) using semantic search and offline LLMs.

The system:
- Runs completely offline (no cloud dependency)
- Uses vector embeddings + local LLM (RAG pipeline)
- Ensures 100% data privacy and ownership
- Enables natural language querying of past digital activities
- Uses encryption (AES-256, RSA) for secure storage and sharing
- Supports multi-source context capture (browser, desktop, clipboard)
- Uses hybrid retrieval (semantic + contextual reranking)

REFERENCE INSIGHTS:
- Achieves ~0.86 F1 score and ~247ms latency on consumer hardware :contentReference[oaicite:0]{index=0}
- Uses vector DB (Chroma/Qdrant) + SQLite hybrid storage
- Uses local LLMs like Mistral 7B or Phi-3
- Implements RAG-based retrieval pipeline
- Focuses on privacy-preserving AI architecture :contentReference[oaicite:1]{index=1}

-----------------------------------

OUTPUT REQUIREMENTS:

1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

Include:

- Product Vision (clear, ambitious, user-centric)
- Problem Statement (current gaps in memory tools, assistants, privacy)
- Target Users (students, developers, professionals, researchers)
- Key Use Cases (real-life scenarios)
- Core Features (detailed breakdown)
- System Architecture (high-level explanation)
- User Flow (step-by-step interaction)
- Functional Requirements
- Non-Functional Requirements (performance, latency, privacy)
- Competitive Analysis (Notion, Siri, Rewind, Recall, etc.)
- Success Metrics (F1 score, latency, adoption, retention)
- Risks & Mitigations

-----------------------------------

2. MVP DEFINITION (VERY IMPORTANT)

Define a **lean but powerful MVP**:

- MVP Goal (what success looks like in 4–6 weeks)
- Must-Have Features (strict prioritization)
- Nice-to-Have Features (exclude from MVP)
- Tech Stack (backend, frontend, AI stack)
- Architecture for MVP (simplified version)
- Data Flow Pipeline (capture → process → store → retrieve → answer)

-----------------------------------

3. MVP IMPLEMENTATION PLAN

Break into:

- Phase 1: Setup (infra, repo, tools)
- Phase 2: Core Capture System
- Phase 3: Embedding + Storage
- Phase 4: Query Engine (RAG)
- Phase 5: UI Interface
- Phase 6: Security Layer

Each phase must include:
- Tasks
- Deliverables
- Tools

-----------------------------------

4. FEATURE PRIORITIZATION (CRITICAL THINKING)

Use:
- MoSCoW or RICE framework
- Explain WHY features are prioritized

-----------------------------------

5. SCALABILITY & FUTURE ROADMAP

- Multi-device sync (privacy-safe)
- Knowledge graph visualization
- Mobile integration
- Voice assistant layer
- Fine-tuned embeddings

-----------------------------------

6. OUTPUT STYLE

- Clean, structured, startup-level PRD
- Bullet points + clarity
- No fluff, only actionable content
- Think like a YC startup founder + senior engineer

-----------------------------------

IMPORTANT:

- Focus heavily on practicality (buildable by 2–4 engineers)
- Keep MVP realistic for college project + product demo
- Optimize for impact, not complexity
- Highlight what makes EchoSphere UNIQUE (privacy + offline AI)