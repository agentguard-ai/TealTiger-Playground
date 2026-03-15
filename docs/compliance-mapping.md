# Compliance Mapping Guide

This guide covers how to map your TealTiger policies to regulatory and security compliance frameworks — how to track coverage, identify gaps, generate reports, and create custom frameworks for your organization's needs.

> Compliance features require authentication and a team workspace. See the [Getting Started Guide](./getting-started.md) for setup.

## Table of Contents

- [Supported Frameworks](#supported-frameworks)
- [Mapping Policies to Frameworks](#mapping-policies-to-frameworks)
- [Coverage Tracking](#coverage-tracking)
- [Generating Compliance Reports](#generating-compliance-reports)
- [Exporting Mappings](#exporting-mappings)
- [Creating Custom Frameworks](#creating-custom-frameworks)
- [Compliance Examples](#compliance-examples)
- [Best Practices](#best-practices)

---

## Supported Frameworks

The playground ships with five built-in compliance frameworks covering AI security, risk management, and data privacy:

| Framework | ID | Version | Controls | Focus Area |
|-----------|----|---------|----------|------------|
| **OWASP Top 10 for Agentic Applications** | `owasp-asi-2024` | 1.0 | 10 | AI/LLM security risks |
| **NIST AI Risk Management Framework** | `nist-ai-rmf-1.0` | 1.0 | 8 | AI risk governance |
| **SOC2 Type II** | `soc2-type-ii` | 2017 | 8 | Security and availability |
| **ISO 27001:2022** | `iso-27001-2022` | 2022 | 8 | Information security management |
| **GDPR** | `gdpr-2018` | 2018 | 8 | Data protection and privacy |

### OWASP Top 10 for Agentic Applications (ASI 2024)

The OWASP ASI framework addresses the top security risks specific to AI agents and LLM applications:

| Code | Title | Category |
|------|-------|----------|
| ASI01 | Prompt Injection | Input Security |
| ASI02 | Sensitive Information Disclosure | Data Protection |
| ASI03 | Supply Chain Vulnerabilities | Supply Chain |
| ASI04 | Data and Model Poisoning | Model Security |
| ASI05 | Improper Output Handling | Output Security |
| ASI06 | Excessive Agency | Access Control |
| ASI07 | System Prompt Leakage | Configuration Security |
| ASI08 | Vector and Embedding Weaknesses | RAG Security |
| ASI09 | Misinformation | Content Quality |
| ASI10 | Unbounded Consumption | Resource Management |

### NIST AI Risk Management Framework 1.0

The NIST AI RMF provides a structured approach to managing AI risks across four functions:

| Code | Title | Category |
|------|-------|----------|
| GOVERN-1.1 | Legal and Regulatory Requirements | Governance |
| GOVERN-1.2 | Risk Management Strategy | Governance |
| MAP-1.1 | Context Establishment | Map |
| MAP-2.1 | Impact Assessment | Map |
| MEASURE-1.1 | Performance Metrics | Measure |
| MEASURE-2.1 | Bias and Fairness Testing | Measure |
| MANAGE-1.1 | Risk Response | Manage |
| MANAGE-2.1 | Incident Response | Manage |

### SOC2 Type II

SOC2 controls relevant to AI systems, covering security, availability, and confidentiality:

| Code | Title | Category |
|------|-------|----------|
| CC6.1 | Logical and Physical Access Controls | Common Criteria |
| CC6.2 | Authentication and Authorization | Common Criteria |
| CC6.6 | Encryption of Data | Common Criteria |
| CC7.2 | System Monitoring | Common Criteria |
| CC7.3 | Security Incident Response | Common Criteria |
| A1.2 | Availability Monitoring | Availability |
| C1.1 | Confidentiality Commitments | Confidentiality |
| P3.1 | Privacy Notice | Privacy |

### ISO 27001:2022

Information security management controls applicable to AI policy governance:

| Code | Title | Category |
|------|-------|----------|
| A.5.1 | Policies for Information Security | Organizational Controls |
| A.5.7 | Threat Intelligence | Organizational Controls |
| A.8.2 | Privileged Access Rights | Technological Controls |
| A.8.3 | Information Access Restriction | Technological Controls |
| A.8.10 | Information Deletion | Technological Controls |
| A.8.16 | Monitoring Activities | Technological Controls |
| A.8.24 | Use of Cryptography | Technological Controls |
| A.8.28 | Secure Coding | Technological Controls |

### GDPR 2018

Data protection articles relevant to AI systems processing personal data:

| Code | Title | Category |
|------|-------|----------|
| Article 5 | Principles Relating to Processing | Principles |
| Article 6 | Lawfulness of Processing | Lawfulness |
| Article 15 | Right of Access | Data Subject Rights |
| Article 17 | Right to Erasure | Data Subject Rights |
| Article 25 | Data Protection by Design | Data Protection |
| Article 32 | Security of Processing | Security |
| Article 33 | Breach Notification | Breach Management |
| Article 35 | Data Protection Impact Assessment | Risk Management |

---

## Mapping Policies to Frameworks

Compliance mapping connects your TealTiger policies to specific framework controls, creating a traceable link between your security implementation and regulatory requirements.

### How to Map a Policy

1. Open a policy in your workspace
2. Click the **"Compliance"** tab in the policy detail view
3. Select a framework from the **Framework Selector** dropdown
4. Browse the list of requirements — unmapped ones are highlighted
5. Click **"Map"** next to a requirement
6. Add a **note** explaining how the policy addresses the requirement
7. Click **Save**

The mapping is stored in the `compliance_mappings` table and logged in the audit trail.

### Mapping Rules

- A single policy can be mapped to multiple requirements across different frameworks
- Multiple policies can be mapped to the same requirement (shared coverage)
- Each mapping includes a notes field — use it to explain the relationship
- Duplicate mappings (same policy + same requirement) are rejected automatically
- Mappings can be removed at any time; removal is also logged in the audit trail

### Removing a Mapping

1. Open the policy's **Compliance** tab
2. Find the mapping you want to remove
3. Click **"Unmap"**
4. Confirm the removal

---

## Coverage Tracking

The compliance dashboard shows how well your workspace's policies cover each framework's requirements.

### Coverage Dashboard

Navigate to the **Compliance Dashboard** from the sidebar to see:

- **Coverage percentage** per framework — calculated as `(mapped requirements / total requirements) × 100`
- **Mapped vs. unmapped** requirement counts
- **Unmapped requirements** highlighted so you can identify gaps at a glance

### Coverage Calculation

Coverage is calculated at the workspace level. If any policy in the workspace is mapped to a requirement, that requirement counts as covered:

```
Coverage % = (unique mapped requirements / total framework requirements) × 100
```

For example, if your workspace has 3 policies mapped to 7 of the 10 OWASP ASI requirements, your OWASP coverage is 70%.

### Identifying Gaps

The **Unmapped Requirements** section lists every framework control that has no policy mapped to it. Use this to:

- Prioritize which policies to write next
- Identify areas where existing policies need compliance annotations
- Prepare for audits by ensuring full coverage of critical frameworks

---

## Generating Compliance Reports

Compliance reports provide a comprehensive snapshot of your workspace's compliance posture — suitable for sharing with auditors, stakeholders, or leadership.

### Generating a Report

1. Open the **Compliance Dashboard**
2. Click **"Generate Report"**
3. Select a framework (or generate for all frameworks)
4. Optionally apply filters:
   - **Date range** — limit to policies modified within a period
   - **Policy state** — filter by Draft, Review, Approved, or Production
5. Click **Generate**

### What's in a Report

Each compliance report includes:

| Section | Contents |
|---------|----------|
| **Executive Summary** | Total policies, mapped policies, coverage percentage, average test coverage, average success rate |
| **Policy Details** | Each policy with its version, author, approval status, last modified date, and mapped requirements |
| **Test Coverage** | Test coverage metrics per policy |
| **Success Rates** | Evaluation success rates per policy |
| **Audit Summary** | Total changes, approvals, and deployments; recent audit events |

### Export Formats

Reports can be exported in two formats:

- **PDF** — formatted report with optional organization branding (name, logo, colors, footer). Suitable for sharing with auditors and stakeholders.
- **CSV** — tabular data with all fields. Suitable for spreadsheet analysis and data processing.

### PDF Branding

When exporting as PDF, you can customize the report with your organization's branding:

```typescript
const branding = {
  organizationName: 'Acme Corp',
  logo: 'https://example.com/logo.png',  // optional
  primaryColor: '#1a73e8',
  footer: 'Confidential — Internal Use Only'  // optional
};
```

### Scheduled Reports

Reports can be generated automatically on a recurring schedule:

1. Open the **Compliance Dashboard**
2. Click **"Schedule Report"**
3. Select a framework
4. Choose a schedule: **Weekly** or **Monthly**
5. Add recipient email addresses
6. Click **Save Schedule**

Scheduled reports are generated and sent to recipients automatically. Each generation is logged in the audit trail.

---

## Exporting Mappings

You can export your compliance mappings independently of full reports for data analysis or integration with external tools.

### Export Formats

| Format | Use Case |
|--------|----------|
| **JSON** | Integration with external compliance tools, programmatic analysis |
| **CSV** | Spreadsheet analysis, importing into GRC platforms |

### How to Export

1. Open the **Compliance Dashboard**
2. Click **"Export Mappings"**
3. Optionally filter by framework
4. Select format: JSON or CSV
5. Click **Export**

### Export Contents

Each exported mapping includes enriched data:

| Field | Description |
|-------|-------------|
| `mapping_id` | Unique mapping identifier |
| `policy_id` | Policy identifier |
| `policy_name` | Policy name |
| `policy_version` | Current semantic version |
| `policy_state` | Current state (draft, review, approved, production) |
| `framework_id` | Framework identifier |
| `framework_name` | Framework display name |
| `requirement_id` | Requirement identifier |
| `requirement_code` | Requirement code (e.g., ASI01, CC6.1) |
| `requirement_title` | Requirement title |
| `requirement_category` | Requirement category |
| `notes` | Mapping notes |
| `created_at` | When the mapping was created |

### JSON Export Example

```json
[
  {
    "mapping_id": "a1b2c3d4-...",
    "policy_id": "e5f6g7h8-...",
    "policy_name": "pii-detection-v1",
    "policy_version": "1.2.0",
    "policy_state": "production",
    "framework_id": "owasp-asi-2024",
    "framework_name": "OWASP ASI 2024",
    "requirement_id": "asi02",
    "requirement_code": "ASI02",
    "requirement_title": "Sensitive Information Disclosure",
    "requirement_category": "Data Protection",
    "notes": "Detects and redacts PII in LLM outputs",
    "created_at": "2026-03-15T10:30:00Z"
  }
]
```

---

## Creating Custom Frameworks

If your organization follows a compliance framework not included in the built-in set, you can define a custom framework using a JSON schema.

### Custom Framework Schema

A custom framework follows this structure:

```json
{
  "id": "my-org-framework-2026",
  "name": "My Organization Security Framework",
  "version": "1.0",
  "requirements": [
    {
      "id": "req-001",
      "frameworkId": "my-org-framework-2026",
      "code": "SEC-001",
      "title": "Input Validation",
      "description": "All AI inputs must be validated and sanitized",
      "category": "Input Security"
    },
    {
      "id": "req-002",
      "frameworkId": "my-org-framework-2026",
      "code": "SEC-002",
      "title": "Output Filtering",
      "description": "All AI outputs must be filtered for sensitive content",
      "category": "Output Security"
    },
    {
      "id": "req-003",
      "frameworkId": "my-org-framework-2026",
      "code": "COST-001",
      "title": "Budget Controls",
      "description": "AI usage must stay within approved budget limits",
      "category": "Cost Management"
    }
  ]
}
```

### Required Fields

Every custom framework must include:

| Field | Level | Description |
|-------|-------|-------------|
| `id` | Framework | Unique identifier (use kebab-case) |
| `name` | Framework | Display name |
| `version` | Framework | Version string |
| `requirements` | Framework | Non-empty array of requirements |
| `id` | Requirement | Unique identifier within the framework |
| `frameworkId` | Requirement | Must match the parent framework's `id` |
| `code` | Requirement | Short code displayed in the UI (e.g., SEC-001) |
| `title` | Requirement | Human-readable title |
| `description` | Requirement | Detailed description of the requirement |
| `category` | Requirement | Grouping category for the UI |

### Loading a Custom Framework

1. Open the **Compliance Dashboard**
2. Click **"Add Custom Framework"**
3. Paste or upload your JSON definition
4. The system validates the schema — any missing fields are flagged
5. Click **Load Framework**

The custom framework appears alongside the built-in frameworks in the Framework Selector and can be used for mapping and reporting.

### Validation Rules

The system validates custom frameworks before loading:

- `id`, `name`, and `version` are required at the framework level
- `requirements` must be a non-empty array
- Each requirement must have `id`, `code`, `title`, `description`, and `category`
- The `frameworkId` on each requirement is automatically set to match the parent framework

---

## Compliance Examples

### Example 1: Mapping a PII Detection Policy to OWASP ASI02

A PII detection policy directly addresses OWASP ASI02 (Sensitive Information Disclosure):

1. Open your `pii-detection` policy
2. Go to the **Compliance** tab
3. Select **OWASP ASI 2024** from the framework dropdown
4. Find **ASI02 — Sensitive Information Disclosure**
5. Click **Map** and add the note:

   > "This policy detects PII patterns (emails, phone numbers, SSNs) in LLM outputs and redacts them before returning to the user. Covers detection of 12 PII categories."

6. Save the mapping

### Example 2: Mapping a Cost Control Policy to Multiple Frameworks

A budget enforcement policy can map to controls across several frameworks:

| Framework | Control | Mapping Note |
|-----------|---------|--------------|
| OWASP ASI 2024 | ASI10 — Unbounded Consumption | "Enforces per-request cost limits and daily budget caps to prevent runaway spending" |
| NIST AI RMF | MANAGE-1.1 — Risk Response | "Implements automated cost risk response by denying requests that exceed budget thresholds" |
| SOC2 Type II | A1.2 — Availability Monitoring | "Monitors API cost and usage in real-time, alerting when budgets approach limits" |

### Example 3: Mapping an RBAC Policy to SOC2 and ISO 27001

An RBAC enforcement policy maps naturally to access control requirements:

| Framework | Control | Mapping Note |
|-----------|---------|--------------|
| SOC2 Type II | CC6.1 — Logical and Physical Access Controls | "Enforces role-based access control for all AI agent interactions" |
| SOC2 Type II | CC6.2 — Authentication and Authorization | "Validates user roles and permissions before allowing LLM access" |
| ISO 27001:2022 | A.8.2 — Privileged Access Rights | "Restricts privileged AI operations to authorized roles only" |
| ISO 27001:2022 | A.8.3 — Information Access Restriction | "Limits data access based on user role and classification level" |

### Example 4: Mapping a Data Residency Policy to GDPR

A data residency policy addresses multiple GDPR articles:

| Framework | Control | Mapping Note |
|-----------|---------|--------------|
| GDPR | Article 5 — Principles Relating to Processing | "Ensures data is processed only in approved geographic regions" |
| GDPR | Article 25 — Data Protection by Design | "Routes requests to region-specific LLM endpoints by default" |
| GDPR | Article 32 — Security of Processing | "Encrypts data in transit between regions and enforces TLS" |

### Example 5: Creating a Custom AI Governance Framework

For organizations with internal AI governance requirements:

```json
{
  "id": "acme-ai-governance-2026",
  "name": "Acme AI Governance Framework",
  "version": "2.0",
  "requirements": [
    {
      "id": "aig-001",
      "frameworkId": "acme-ai-governance-2026",
      "code": "AIG-001",
      "title": "Human Oversight",
      "description": "All AI decisions affecting customers must have human review capability",
      "category": "Governance"
    },
    {
      "id": "aig-002",
      "frameworkId": "acme-ai-governance-2026",
      "code": "AIG-002",
      "title": "Model Transparency",
      "description": "AI model selection and reasoning must be logged and auditable",
      "category": "Transparency"
    },
    {
      "id": "aig-003",
      "frameworkId": "acme-ai-governance-2026",
      "code": "AIG-003",
      "title": "Bias Monitoring",
      "description": "AI outputs must be monitored for bias across protected categories",
      "category": "Fairness"
    },
    {
      "id": "aig-004",
      "frameworkId": "acme-ai-governance-2026",
      "code": "AIG-004",
      "title": "Cost Accountability",
      "description": "AI usage costs must be attributed to business units",
      "category": "Cost Management"
    }
  ]
}
```

Load this framework, then map your policies to `AIG-001` through `AIG-004` just like you would with any built-in framework.

---

## Best Practices

### Getting Started

- **Start with OWASP ASI** — it's the most directly relevant framework for AI/LLM security policies and maps naturally to TealTiger's guardrails
- **Map as you build** — add compliance mappings when you create or update a policy, not as an afterthought
- **Write meaningful notes** — explain specifically how the policy addresses the requirement, not just that it does

### Coverage Strategy

- **Aim for 100% on your primary framework** — identify gaps early using the unmapped requirements list
- **Cross-map to multiple frameworks** — a single policy often addresses controls in several frameworks simultaneously
- **Prioritize production policies** — auditors care most about policies that are actually deployed and enforced

### Reporting

- **Generate reports monthly** — use scheduled reports to maintain a consistent compliance paper trail
- **Export as PDF for auditors** — include your organization's branding for a professional presentation
- **Export as CSV for analysis** — track coverage trends over time in a spreadsheet
- **Filter by policy state** — generate separate reports for production policies (for auditors) and all policies (for internal tracking)

### Custom Frameworks

- **Mirror your organization's control numbering** — use the same codes your compliance team already references
- **Keep requirements specific** — vague requirements lead to vague mappings that don't satisfy auditors
- **Version your framework** — update the version string when you add or modify requirements

### Audit Readiness

- **All mapping changes are logged** — creation and removal of mappings appear in the [Audit Trail](./audit-trail.md)
- **Reports include audit summaries** — every generated report captures recent changes, approvals, and deployments
- **Use the governance workflow** — policies mapped to compliance frameworks should go through the full [approval process](./governance-workflow.md) before reaching production

---

## Related Guides

- [Getting Started](./getting-started.md) — Sign in, create workspaces, write your first policy
- [Governance Workflow Guide](./governance-workflow.md) — Approval processes, emergency bypass, impact analysis
- [Audit Trail Guide](./audit-trail.md) — Immutable logging, filtering, and export
- [CI/CD Integration Guide](./cicd-integration.md) — Automated policy testing with GitHub Actions
