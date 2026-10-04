# Article sharing kit

Prepared copy, not automatically posted. Use one article at a time and participate in the discussion it starts. Social previews are generated from the original artwork at `/og/<slug>.jpg`.

## Agent memory

A prompt injection that reaches an agent's memory can survive the conversation that introduced it. I wrote about the evidence behind that risk and the practical controls around memory writes, review and persistence.

https://blog.vyasdevgna.online/blog/agent-memory-is-an-attack-surface/

## MCP connections

Connecting an MCP server is a small setup step with a substantial trust decision behind it. This checklist follows the protocol's security guidance and turns the named attacks into questions to ask before connecting or building a server.

https://blog.vyasdevgna.online/blog/mcp-server-security-checklist/

## HERMES

What does a 94.7% accuracy figure tell you about an edge intrusion detector? I revisited our HERMES manuscript to explain the two-stage pipeline, ARM resource trade-offs, and numerical discrepancies that need reconciliation before using the benchmark for a deployment decision.

https://blog.vyasdevgna.online/blog/edge-intrusion-detection-power-budget/

## AI code review

A one-line change can carry more risk than a large feature. This article explains how to review AI-written code by the consequences of failure, with an illustrative authentication change and a concrete review checklist.

https://blog.vyasdevgna.online/blog/reviewing-ai-written-code-by-risk/

## Browser file transfer

Direct browser file transfer still has to solve signalling, NAT traversal and backpressure. Using ez-drop as the running example, I explain where WebRTC helps and where a direct route can fail.

https://blog.vyasdevgna.online/blog/browser-to-browser-file-transfer-webrtc/

## Local-first collaboration

Two people edit the same shape at once. What should every screen show when the messages arrive in different orders? This walkthrough uses EzBoard to explain versions, tie-breaking and tombstones, including the costs of that model.

https://blog.vyasdevgna.online/blog/local-first-collaboration-without-a-server/

## Publication architecture

The reading surface of this blog is static; accounts and conversations run separately. I explain the Astro, Cloudflare and Postgres choices, their limits, and the guards around the dynamic routes.

https://blog.vyasdevgna.online/blog/how-this-blog-is-built/

## Measure the response

Use Search Console impressions, clicks and query reports as the search feedback loop. Review referrals in the already configured Cloudflare analytics, without adding a new tracking service. Prefer a clearer explanation or an additional sourced example over keyword stuffing. Change `updatedAt` only when the article itself materially changes.

Repository documentation can link to a matching article when it helps users understand that project. Cross-posts should retain the original canonical URL. Do not promise rankings, create repetitive submissions, buy links or post irrelevant promotional comments.
