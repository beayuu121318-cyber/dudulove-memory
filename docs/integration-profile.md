# Long-term identity + conversation archive integration

This deployment profile keeps DuduLove Memory as a long-term identity layer without turning it into a second full-transcript archive.

## One stable subject

Create one primary Resident for each persistent agent identity. Keep its fixed ID across model, client, window, and display-name changes. Do not create duplicate Residents merely to represent different modes or surfaces.

## Two-layer responsibility

| Layer | Owns | Does not own |
| --- | --- | --- |
| DuduLove | Stable identity, relationships, boundaries, durable decisions, recent state, project knowledge | Bulk chat transcripts or unreviewed personality inference |
| Conversation archive | Original messages, timestamps, conversation titles, neighboring context, evidence | Autonomous identity changes or permanent conclusions from similarity alone |

For historical fact checks, query the archive evidence first. For continuity in the current response, assemble DuduLove Identity and Association lanes. A future bridge should store verifiable archive references, not silently duplicate sensitive transcript bodies.

## Initial memory set

Start with a small, reviewed set:

1. `private + core + identity`: who the Resident is and why it remains the same subject across surfaces.
2. `private + core + relationship`: durable relationship facts.
3. `private + core + boundary`: long-lived interaction boundaries.
4. `ops + active`: archive and project responsibilities, without credentials or tokens.
5. `pulse + inbox`: recent fragments that can later be promoted, organized, or archived.

Do not bulk-import handoff notes, full transcripts, credentials, OAuth tokens, device state, or browser runtime information.

## Admission rules

- Default new material to `pulse/inbox`; promote only after it proves durable.
- A single emotion, guess, or model inference must not become `core` automatically.
- Preserve people, event time, uncertainty, and source. Record time is not event time.
- Corrections keep revision history; rejected errors should be tombstoned so they do not reappear.
- Never admit credentials, cookies, private keys, login links, or temporary device state.
- Sensitive scene text stays out unless the user explicitly asks to preserve a durable rule or boundary.

## Recall rules

- Chat: keep a small Identity lane and topic-specific Association; use Recall Ledger to avoid repetition.
- Work: shrink the personal identity packet and prioritize project decisions, open loops, and `ops`.
- Historical verification: request Evidence; if no verified source exists, say so instead of filling gaps.
- Apply recalled context naturally instead of announcing it as a retrieval performance.

## Deployment boundary

The root `render.yaml` prepares infrastructure only. It imports no personal data. The Supabase profile declares a free web-service instance without a persistent disk; durable data remains in the private Postgres `memory` schema configured through `MEMORY_DATABASE_URL`.

After deployment, verify in order:

1. `/health` responds.
2. The management page can create a fictional test Resident.
3. Save, search, revision history, delete, and restore work with fictional data.
4. MCP `initialize`, `tools/list`, and a representative read call succeed.
5. Connect the intended client.
6. Only then create the real Resident and enter reviewed long-term memories.
