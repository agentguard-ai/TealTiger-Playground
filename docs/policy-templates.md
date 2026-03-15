# Policy Template Guide

The TealTiger Playground ships with 15 enterprise-ready policy templates organized into six categories. Each template is fully customizable — adjust parameters, preview the generated code, and save to your workspace.

> Templates are managed by `PolicyTemplateService`. Browse them in the Template Library sidebar or use the service API directly.

## Table of Contents

- [Quick Start](#quick-start)
- [Template Categories](#template-categories)
- [Security Templates](#security-templates)
  - [1. PII Detection and Redaction](#1-pii-detection-and-redaction)
  - [2. Content Moderation](#2-content-moderation)
  - [3. Prompt Injection Detection](#3-prompt-injection-detection)
  - [4. RBAC Enforcement](#4-rbac-enforcement)
- [Cost Control Templates](#cost-control-templates)
  - [5. Cost Control and Budget Enforcement](#5-cost-control-and-budget-enforcement)
  - [6. Rate Limiting and Throttling](#6-rate-limiting-and-throttling)
  - [7. Token Optimization](#7-token-optimization)
- [Reliability Templates](#reliability-templates)
  - [8. Circuit Breaker](#8-circuit-breaker)
  - [9. Retry Strategy](#9-retry-strategy)
  - [10. Model Fallback Strategy](#10-model-fallback-strategy)
- [Compliance Templates](#compliance-templates)
  - [11. Compliance Audit Logging](#11-compliance-audit-logging)
  - [12. Data Residency Compliance](#12-data-residency-compliance)
- [Routing Templates](#routing-templates)
  - [13. Multi-Provider Routing](#13-multi-provider-routing)
- [Performance Templates](#performance-templates)
  - [14. Semantic Cache](#14-semantic-cache)
  - [15. Load Balancing](#15-load-balancing)
- [Customization Process](#customization-process)
- [Parameter Configuration](#parameter-configuration)
- [Saving Templates to Your Workspace](#saving-templates-to-your-workspace)
- [Combining Templates](#combining-templates)

---

## Quick Start

1. Open the **Template Library** from the sidebar
2. Pick a template by category or search by name
3. Click the template card to open the **Template Customizer**
4. Adjust parameters using the form inputs
5. Preview the generated code
6. Click **"Save to Workspace"** to create a policy from the template

---

## Template Categories

| Category        | Count | Purpose                                      |
|-----------------|-------|----------------------------------------------|
| Security        | 4     | Protect against attacks and data leaks        |
| Cost Control    | 3     | Manage budgets, rates, and token usage        |
| Reliability     | 3     | Handle failures, retries, and fallbacks       |
| Compliance      | 2     | Audit logging and data residency              |
| Routing         | 1     | Multi-provider request routing                |
| Performance     | 2     | Caching and load balancing                    |

---

## Security Templates

### 1. PII Detection and Redaction

| Field | Value |
|-------|-------|
| ID | `pii-detection-redaction` |
| Difficulty | Beginner |
| Compliance | GDPR Article 32, OWASP ASI02, SOC2 CC6.1 |
| Tags | `pii`, `privacy`, `gdpr`, `security`, `data-protection` |

Detects personally identifiable information in requests and responses, then blocks, redacts, or monitors based on your configuration.

**Supported PII types:** email addresses, phone numbers, Social Security Numbers, credit card numbers, physical addresses.

#### Parameters

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `action` | string | `REDACT` | Yes | Action when PII is detected. Options: `DENY`, `REDACT`, `MONITOR` |
| `piiTypes` | array | `["email","phone","ssn","credit_card","address"]` | Yes | PII types to detect |
| `redactionChar` | string | `*` | No | Character used for redaction |

#### Use Case Examples

**Block all PII (high-security environment):**
```
action: DENY
piiTypes: ["email", "phone", "ssn"]
```
Blocks any request or response containing PII. Use this for environments where no personal data should pass through the AI pipeline.

**Redact PII from responses (customer-facing app):**
```
action: REDACT
piiTypes: ["email", "phone", "credit_card"]
redactionChar: X
```
Allows requests but replaces PII in responses with `XXXX`. Ideal for customer support chatbots where the model might surface user data.

---

### 2. Content Moderation

| Field | Value |
|-------|-------|
| ID | `content-moderation` |
| Difficulty | Intermediate |
| Compliance | OWASP ASI04, SOC2 CC6.7 |
| Tags | `moderation`, `safety`, `content-filtering`, `toxicity` |

Filters harmful or inappropriate content using toxicity scoring and category-based classification. Covers both request prompts and model responses.

**Moderation categories:** hate speech, violence, sexual content, self-harm, harassment.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `categories` | array | `["hate","violence","sexual","self-harm"]` | Yes | — |
| `toxicityThreshold` | number | `0.7` | Yes | 0–1 |
| `action` | string | `DENY` | Yes | `DENY`, `MONITOR`, `SANITIZE` |

**Toxicity score ranges:**
- 0.0–0.3: Clean content
- 0.3–0.7: Borderline
- 0.7–1.0: Toxic

#### Use Case Examples

**Strict moderation for public-facing app:**
```
categories: ["hate", "violence", "sexual", "self-harm", "harassment"]
toxicityThreshold: 0.5
action: DENY
```

**Sanitize responses while monitoring:**
```
categories: ["hate", "violence"]
toxicityThreshold: 0.7
action: SANITIZE
```
Removes harmful segments from responses instead of blocking entirely. Good for applications where partial responses are acceptable.

---

### 3. Prompt Injection Detection

| Field | Value |
|-------|-------|
| ID | `prompt-injection-detection` |
| Difficulty | Advanced |
| Compliance | OWASP ASI01, NIST AI RMF GOVERN-1.1 |
| Tags | `security`, `prompt-injection`, `jailbreak`, `attack-prevention` |

Detects and blocks prompt injection attacks including jailbreaks, role-playing exploits, instruction overrides, delimiter attacks, and encoding attacks.

#### Parameters

| Parameter | Type | Default | Required | Options |
|-----------|------|---------|----------|---------|
| `sensitivity` | string | `medium` | Yes | `low`, `medium`, `high` |
| `blockJailbreaks` | boolean | `true` | Yes | — |
| `blockRolePlay` | boolean | `true` | Yes | — |

**Sensitivity levels:**
- **Low** — catches only obvious attacks; minimal false positives
- **Medium** — balanced detection (recommended for most apps)
- **High** — aggressive detection; may flag creative prompts

#### Use Case Examples

**Maximum protection (financial/healthcare):**
```
sensitivity: high
blockJailbreaks: true
blockRolePlay: true
```

**Balanced protection (general SaaS):**
```
sensitivity: medium
blockJailbreaks: true
blockRolePlay: false
```
Blocks jailbreak attempts but allows creative role-play prompts. Good for applications where users legitimately use persona-based prompting.

---

### 4. RBAC Enforcement

| Field | Value |
|-------|-------|
| ID | `rbac-enforcement` |
| Difficulty | Advanced |
| Compliance | SOC2 CC6.1, ISO 27001 A.9.2, NIST AI RMF GOVERN-1.2 |
| Tags | `rbac`, `access-control`, `permissions`, `authorization` |

Restricts AI model and feature access based on user roles. Supports hierarchical roles with permission inheritance.

#### Parameters

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `roleHierarchy` | object | `{"admin":["editor","viewer"],"editor":["viewer"],"viewer":[]}` | Yes | Role inheritance tree |
| `modelPermissions` | object | `{"admin":["*"],"editor":["gpt-4","claude-3"],"viewer":["gpt-3.5-turbo"]}` | Yes | Models allowed per role |
| `strictMode` | boolean | `true` | Yes | Deny unknown roles (vs. default to viewer) |

#### Use Case Examples

**Standard three-tier RBAC:**
```
roleHierarchy: { admin: ["editor", "viewer"], editor: ["viewer"], viewer: [] }
modelPermissions: { admin: ["*"], editor: ["gpt-4", "claude-3"], viewer: ["gpt-3.5-turbo"] }
strictMode: true
```
Admins access all models, editors get GPT-4 and Claude, viewers are limited to GPT-3.5.

**Permissive RBAC (internal tools):**
```
roleHierarchy: { admin: ["user"], user: [] }
modelPermissions: { admin: ["*"], user: ["gpt-3.5-turbo"] }
strictMode: false
```
Unknown roles fall back to viewer-level permissions instead of being denied.

---

## Cost Control Templates

### 5. Cost Control and Budget Enforcement

| Field | Value |
|-------|-------|
| ID | `cost-control-budget` |
| Difficulty | Beginner |
| Compliance | SOC2 CC5.2 |
| Tags | `cost`, `budget`, `optimization`, `finance` |

Estimates request cost before execution and blocks requests that would exceed per-request, daily, or monthly budget limits.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `perRequestLimit` | number | `0.10` | Yes | $0.001–$100 |
| `dailyBudget` | number | `10.00` | No | $0.01–$10,000 |
| `monthlyBudget` | number | `100.00` | No | $0.01–$100,000 |

#### Use Case Examples

**Strict per-request limit (free tier):**
```
perRequestLimit: 0.05
```
Caps each request at $0.05. Daily and monthly budgets are optional.

**Full budget enforcement (team workspace):**
```
perRequestLimit: 1.00
dailyBudget: 50.00
monthlyBudget: 1000.00
```
Layered protection: per-request cap prevents expensive single calls, daily and monthly caps prevent runaway spending.

---

### 6. Rate Limiting and Throttling

| Field | Value |
|-------|-------|
| ID | `rate-limiting-throttling` |
| Difficulty | Intermediate |
| Compliance | OWASP ASI03 |
| Tags | `rate-limiting`, `throttling`, `abuse-prevention`, `cost-control` |

Sliding window rate limiting per user or API key. Supports per-minute and per-hour windows with burst allowance for traffic spikes.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `requestsPerMinute` | number | `10` | Yes | 1–1,000 |
| `requestsPerHour` | number | `100` | No | 1–10,000 |
| `burstAllowance` | number | `5` | No | 0–100 |

#### Use Case Examples

**Free tier users:**
```
requestsPerMinute: 5
requestsPerHour: 50
burstAllowance: 2
```

**Enterprise users:**
```
requestsPerMinute: 100
requestsPerHour: 1000
burstAllowance: 20
```

---

### 7. Token Optimization

| Field | Value |
|-------|-------|
| ID | `token-optimization` |
| Difficulty | Intermediate |
| Compliance | SOC2 CC5.2 |
| Tags | `tokens`, `optimization`, `cost`, `efficiency` |

Reduces costs by capping input/output tokens and optionally compressing long prompts without sacrificing output quality.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `maxInputTokens` | number | `2000` | Yes | 100–100,000 |
| `maxOutputTokens` | number | `1000` | Yes | 50–100,000 |
| `compressionEnabled` | boolean | `true` | Yes | — |

#### Use Case Examples

**Aggressive optimization (minimize costs):**
```
maxInputTokens: 1000
maxOutputTokens: 500
compressionEnabled: true
```
Compresses prompts exceeding the limit and caps output tokens.

**Balanced (quality-first):**
```
maxInputTokens: 3000
maxOutputTokens: 1500
compressionEnabled: false
```
Caps tokens but skips compression to preserve prompt fidelity.

---

## Reliability Templates

### 8. Circuit Breaker

| Field | Value |
|-------|-------|
| ID | `circuit-breaker` |
| Difficulty | Advanced |
| Compliance | SOC2 CC5.1 |
| Tags | `circuit-breaker`, `reliability`, `resilience`, `fault-tolerance` |

Prevents cascading failures by tracking provider errors and temporarily blocking requests after a failure threshold is reached.

**States:** CLOSED (normal) → OPEN (blocking) → HALF_OPEN (testing recovery) → CLOSED

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `failureThreshold` | number | `5` | Yes | 1–100 |
| `timeout` | number | `60000` | Yes | 1,000–600,000 ms |
| `halfOpenRequests` | number | `3` | Yes | 1–10 |

#### Use Case Examples

**Sensitive circuit (real-time apps):**
```
failureThreshold: 3
timeout: 30000
halfOpenRequests: 2
```
Opens after just 3 failures, tests recovery after 30 seconds.

**Tolerant circuit (batch processing):**
```
failureThreshold: 10
timeout: 120000
halfOpenRequests: 5
```
Allows more failures before tripping, longer recovery window.

---

### 9. Retry Strategy

| Field | Value |
|-------|-------|
| ID | `retry-strategy` |
| Difficulty | Intermediate |
| Compliance | — |
| Tags | `retry`, `reliability`, `resilience`, `backoff` |

Handles transient failures (timeouts, rate limits, server errors, network errors) with exponential backoff and jitter.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `maxRetries` | number | `3` | Yes | 1–10 |
| `initialDelay` | number | `1000` | Yes | 100–10,000 ms |
| `maxDelay` | number | `30000` | Yes | 1,000–300,000 ms |

#### Use Case Examples

**Aggressive retry (latency-tolerant):**
```
maxRetries: 5
initialDelay: 500
maxDelay: 10000
```

**Conservative retry (user-facing):**
```
maxRetries: 2
initialDelay: 2000
maxDelay: 60000
```

---

### 10. Model Fallback Strategy

| Field | Value |
|-------|-------|
| ID | `model-fallback-strategy` |
| Difficulty | Intermediate |
| Compliance | SOC2 CC5.1 |
| Tags | `fallback`, `reliability`, `high-availability`, `resilience` |

Automatically switches to alternative models when the primary model fails, is rate-limited, or unavailable. Models are tried in order until one succeeds.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `fallbackChain` | array | `["gpt-4","gpt-3.5-turbo","claude-3-sonnet"]` | Yes | — |
| `maxRetries` | number | `3` | Yes | 1–10 |
| `fallbackOnRateLimit` | boolean | `true` | Yes | — |

#### Use Case Examples

**Multi-provider fallback:**
```
fallbackChain: ["gpt-4", "claude-3-opus", "gemini-pro"]
maxRetries: 3
fallbackOnRateLimit: true
```
Tries GPT-4 first, falls back to Claude, then Gemini. Covers provider outages and rate limits.

**Same-provider fallback:**
```
fallbackChain: ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
maxRetries: 2
fallbackOnRateLimit: false
```
Stays within OpenAI but downgrades model tier on failure.

---

## Compliance Templates

### 11. Compliance Audit Logging

| Field | Value |
|-------|-------|
| ID | `compliance-audit-logging` |
| Difficulty | Intermediate |
| Compliance | GDPR Article 30, HIPAA 164.312, SOC2 CC5.2, ISO 27001 A.12.4 |
| Tags | `audit`, `compliance`, `logging`, `gdpr`, `hipaa`, `soc2` |

Captures tamper-proof audit logs of all AI interactions with automatic PII redaction and compliance-ready export formats.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `logLevel` | string | `detailed` | Yes | `minimal`, `standard`, `detailed` |
| `redactPII` | boolean | `true` | Yes | — |
| `retentionDays` | number | `90` | Yes | 1–2,555 |

**Log levels:**
- **Minimal** — provider, model, timestamp only
- **Standard** — adds prompt length, response length, parameters, cost
- **Detailed** — full request/response content (with PII redaction), latency, tokens, user agent

#### Use Case Examples

**GDPR compliance:**
```
logLevel: detailed
redactPII: true
retentionDays: 90
```

**HIPAA compliance (healthcare):**
```
logLevel: detailed
redactPII: true
retentionDays: 2555
```
7-year retention period as required by HIPAA regulations.

---

### 12. Data Residency Compliance

| Field | Value |
|-------|-------|
| ID | `data-residency-compliance` |
| Difficulty | Intermediate |
| Compliance | GDPR Article 44, CCPA, ISO 27001 A.18.1 |
| Tags | `data-residency`, `gdpr`, `compliance`, `regional` |

Enforces geographic restrictions on data processing by routing requests only to providers in allowed regions.

**Supported regions:** `eu-west`, `eu-central`, `eu-north`, `us-east`, `us-west`, `us-central`, `ap-southeast`, `ap-northeast`, `ca-central`, `uk-south`

#### Parameters

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `allowedRegions` | array | `["eu-west","eu-central"]` | Yes | Permitted processing regions |
| `userRegion` | string | `eu-west` | Yes | User's data region |
| `strictMode` | boolean | `true` | Yes | Block vs. monitor cross-region transfers |

#### Use Case Examples

**EU GDPR strict compliance:**
```
allowedRegions: ["eu-west", "eu-central"]
userRegion: eu-west
strictMode: true
```
Blocks any request routed to a non-EU provider endpoint.

**Multi-region with monitoring:**
```
allowedRegions: ["us-east", "us-west", "eu-west"]
userRegion: us-east
strictMode: false
```
Allows cross-region transfers but logs them for review.

---

## Routing Templates

### 13. Multi-Provider Routing

| Field | Value |
|-------|-------|
| ID | `multi-provider-routing` |
| Difficulty | Intermediate |
| Compliance | SOC2 CC5.2 |
| Tags | `routing`, `multi-provider`, `optimization`, `failover` |

Routes requests across multiple AI providers based on cost, latency, load, or round-robin distribution. Supports automatic fallback when a provider is down.

**Supported providers:** OpenAI, Anthropic, Google Gemini, AWS Bedrock, Azure OpenAI

#### Parameters

| Parameter | Type | Default | Required | Options |
|-----------|------|---------|----------|---------|
| `strategy` | string | `cost-optimized` | Yes | `cost-optimized`, `latency-optimized`, `round-robin`, `weighted` |
| `providers` | array | `["openai","anthropic","gemini"]` | Yes | — |
| `fallbackEnabled` | boolean | `true` | Yes | — |

**Routing strategies:**
- **cost-optimized** — always picks the cheapest provider
- **latency-optimized** — picks the fastest provider
- **round-robin** — distributes evenly across providers
- **weighted** — distributes based on inverse current load

#### Use Case Examples

**Cost optimization (batch processing):**
```
strategy: cost-optimized
providers: ["openai", "anthropic", "gemini"]
fallbackEnabled: true
```

**Low latency (real-time chat):**
```
strategy: latency-optimized
providers: ["openai", "anthropic"]
fallbackEnabled: true
```

---

## Performance Templates

### 14. Semantic Cache

| Field | Value |
|-------|-------|
| ID | `semantic-cache` |
| Difficulty | Advanced |
| Compliance | — |
| Tags | `cache`, `performance`, `cost`, `similarity` |

Caches AI responses and returns cached results for semantically similar queries, reducing both cost and latency.

#### Parameters

| Parameter | Type | Default | Required | Validation |
|-----------|------|---------|----------|------------|
| `similarityThreshold` | number | `0.85` | Yes | 0–1 |
| `cacheTTL` | number | `3600` | Yes | 60–86,400 seconds |
| `maxCacheSize` | number | `1000` | Yes | 10–100,000 entries |

#### Use Case Examples

**High-precision cache (factual queries):**
```
similarityThreshold: 0.95
cacheTTL: 1800
maxCacheSize: 500
```
Only returns cached results for near-identical queries. 30-minute TTL keeps data fresh.

**Aggressive caching (FAQ/support):**
```
similarityThreshold: 0.80
cacheTTL: 7200
maxCacheSize: 5000
```
Broader matching for repetitive support queries. 2-hour TTL with large cache.

---

### 15. Load Balancing

| Field | Value |
|-------|-------|
| ID | `load-balancing` |
| Difficulty | Advanced |
| Compliance | SOC2 CC5.2 |
| Tags | `load-balancing`, `performance`, `distribution`, `scaling` |

Distributes requests across multiple endpoints using configurable algorithms with optional health checking.

#### Parameters

| Parameter | Type | Default | Required | Options |
|-----------|------|---------|----------|---------|
| `algorithm` | string | `least-connections` | Yes | `round-robin`, `least-connections`, `weighted`, `random` |
| `endpoints` | array | `["endpoint-1","endpoint-2","endpoint-3"]` | Yes | — |
| `healthCheckEnabled` | boolean | `true` | Yes | — |

#### Use Case Examples

**Round-robin across regions:**
```
algorithm: round-robin
endpoints: ["us-east", "us-west", "eu-west"]
healthCheckEnabled: true
```

**Least-connections (variable workloads):**
```
algorithm: least-connections
endpoints: ["endpoint-1", "endpoint-2"]
healthCheckEnabled: true
```
Routes each request to the endpoint with the fewest active connections.

---

## Customization Process

### Step-by-Step

1. **Browse** — Open the Template Library from the sidebar. Filter by category or search by name/tag.
2. **Select** — Click a template card to open the Template Customizer.
3. **Configure** — Adjust parameters using the form inputs. Each parameter shows its type, default value, and validation constraints.
4. **Preview** — The customizer generates live code preview with your parameter values substituted into the template.
5. **Validate** — The service validates all parameters before generating code. Errors appear inline next to invalid fields.
6. **Save** — Click "Save to Workspace" to create a new policy from the customized template.

### Using the Service API

You can also customize templates programmatically:

```typescript
import { policyTemplateService } from './services/PolicyTemplateService';

// List all templates
const templates = policyTemplateService.listTemplates();

// Get templates by category
const securityTemplates = policyTemplateService.getTemplatesByCategory('security');

// Search templates
const results = policyTemplateService.searchTemplates('rate limit');

// Get a specific template
const template = policyTemplateService.getTemplate('pii-detection-redaction');

// Customize a template
const code = policyTemplateService.customizeTemplate('pii-detection-redaction', {
  action: 'DENY',
  piiTypes: ['email', 'ssn'],
  redactionChar: 'X',
});

// Validate parameters before customizing
const validation = policyTemplateService.validateParameters('cost-control-budget', {
  perRequestLimit: 0.05,
  dailyBudget: 50,
});
// validation.isValid === true
// validation.errors === []
// validation.warnings === []
```

---

## Parameter Configuration

### Parameter Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text value, often with predefined options | `"DENY"`, `"medium"` |
| `number` | Numeric value with optional min/max range | `0.10`, `3600` |
| `boolean` | Toggle on/off | `true`, `false` |
| `array` | List of values | `["email", "phone"]` |
| `object` | Key-value structure | `{ admin: ["*"] }` |

### Validation Rules

Parameters are validated automatically when you customize a template:

- **Required check** — required parameters must be provided
- **Type check** — values must match the declared type
- **Range check** — numbers must fall within `min`/`max` bounds
- **Options check** — strings must be one of the allowed options (when defined)
- **Pattern check** — strings must match the regex pattern (when defined)
- **Unknown parameters** — extra parameters generate warnings (not errors)

### Default Values

Every parameter has a sensible default. You only need to override the values you want to change. Unspecified optional parameters use their defaults automatically.

---

## Saving Templates to Your Workspace

After customizing a template, click **"Save to Workspace"** to create a new policy. The saved policy includes:

- The generated code with your parameter values
- A reference to the source template ID
- Your parameter choices (for re-customization later)
- Workspace and author metadata

Saved policies enter **Draft** state and follow the standard [governance workflow](./governance-workflow.md) (Draft → Review → Approved → Production).

---

## Combining Templates

Templates work well together. Common combinations:

| Combination | Templates | Purpose |
|-------------|-----------|---------|
| Security stack | PII Detection + Content Moderation + Prompt Injection | Full input/output protection |
| Cost management | Budget Enforcement + Rate Limiting + Token Optimization | Layered cost control |
| High availability | Circuit Breaker + Retry Strategy + Model Fallback | Resilient AI pipeline |
| Compliance bundle | Audit Logging + Data Residency + RBAC Enforcement | Regulatory compliance |
| Performance | Semantic Cache + Load Balancing + Multi-Provider Routing | Optimized throughput |

Create each template as a separate policy in your workspace, then configure your evaluation pipeline to run them in sequence. Security policies should run first, followed by routing, then cost controls.
