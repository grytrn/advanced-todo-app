# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for this project.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. This helps future developers (including AI agents) understand why certain decisions were made.

## Creating a New ADR

1. Copy the template: `ADR-000-template.md`
2. Name it: `ADR-XXX-brief-description.md` (increment XXX)
3. Fill in all sections
4. Set status to "Proposed" initially
5. After team/agent review, update to "Accepted"
6. Update @tech-stack import if relevant

## ADR Status Values

- **Proposed**: Under discussion
- **Accepted**: Decision approved and implemented
- **Deprecated**: No longer relevant but kept for history
- **Superseded by ADR-XXX**: Replaced by another ADR

## Current ADRs

- [ADR-000: Template](ADR-000-template.md)
- [ADR-001: Fastify for Backend Framework](ADR-001-fastify-backend.md)
- [ADR-002: JWT Authentication Strategy](ADR-002-jwt-authentication.md)

## For Claude Agents

Before making architectural changes:
1. Check existing ADRs for related decisions
2. If your change conflicts with an existing ADR, create a new ADR explaining why
3. For significant new architecture, create an ADR before implementing
4. Reference ADR numbers in commit messages when implementing decisions
5. Update @tech-stack import after ADR is accepted
