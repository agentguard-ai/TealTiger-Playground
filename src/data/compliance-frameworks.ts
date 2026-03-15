// Built-in compliance frameworks
// Requirements: 8.1-8.5

import type { ComplianceFramework } from '../types/compliance';

/**
 * OWASP Top 10 for Agentic Applications (ASI 2024)
 * Requirements: 8.1
 */
export const OWASP_ASI_2024: ComplianceFramework = {
  id: 'owasp-asi-2024',
  name: 'OWASP ASI 2024',
  version: '1.0',
  requirements: [
    {
      id: 'asi01',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI01',
      title: 'Prompt Injection',
      description: 'Manipulating LLM inputs to execute unintended actions or bypass safety controls',
      category: 'Input Security'
    },
    {
      id: 'asi02',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI02',
      title: 'Sensitive Information Disclosure',
      description: 'Unintended exposure of confidential data through LLM outputs',
      category: 'Data Protection'
    },
    {
      id: 'asi03',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI03',
      title: 'Supply Chain Vulnerabilities',
      description: 'Risks from third-party models, datasets, or plugins',
      category: 'Supply Chain'
    },
    {
      id: 'asi04',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI04',
      title: 'Data and Model Poisoning',
      description: 'Manipulation of training data or model weights to compromise behavior',
      category: 'Model Security'
    },
    {
      id: 'asi05',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI05',
      title: 'Improper Output Handling',
      description: 'Insufficient validation of LLM outputs leading to downstream vulnerabilities',
      category: 'Output Security'
    },
    {
      id: 'asi06',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI06',
      title: 'Excessive Agency',
      description: 'LLM agents with too much autonomy or access to sensitive functions',
      category: 'Access Control'
    },
    {
      id: 'asi07',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI07',
      title: 'System Prompt Leakage',
      description: 'Exposure of system instructions or configuration through prompt manipulation',
      category: 'Configuration Security'
    },
    {
      id: 'asi08',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI08',
      title: 'Vector and Embedding Weaknesses',
      description: 'Vulnerabilities in RAG systems and vector databases',
      category: 'RAG Security'
    },
    {
      id: 'asi09',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI09',
      title: 'Misinformation',
      description: 'Generation of false, misleading, or hallucinated content',
      category: 'Content Quality'
    },
    {
      id: 'asi10',
      frameworkId: 'owasp-asi-2024',
      code: 'ASI10',
      title: 'Unbounded Consumption',
      description: 'Uncontrolled resource usage leading to cost overruns or denial of service',
      category: 'Resource Management'
    }
  ]
};

/**
 * NIST AI Risk Management Framework 1.0
 * Requirements: 8.2
 */
export const NIST_AI_RMF_1_0: ComplianceFramework = {
  id: 'nist-ai-rmf-1.0',
  name: 'NIST AI RMF 1.0',
  version: '1.0',
  requirements: [
    {
      id: 'govern-1.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'GOVERN-1.1',
      title: 'Legal and Regulatory Requirements',
      description: 'Processes are in place to identify and manage legal and regulatory requirements',
      category: 'Governance'
    },
    {
      id: 'govern-1.2',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'GOVERN-1.2',
      title: 'Risk Management Strategy',
      description: 'Organizational risk tolerance and strategy are documented and communicated',
      category: 'Governance'
    },
    {
      id: 'map-1.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'MAP-1.1',
      title: 'Context Establishment',
      description: 'Context of AI system use is documented including purpose and stakeholders',
      category: 'Map'
    },
    {
      id: 'map-2.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'MAP-2.1',
      title: 'Impact Assessment',
      description: 'Potential impacts of AI system are identified and documented',
      category: 'Map'
    },
    {
      id: 'measure-1.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'MEASURE-1.1',
      title: 'Performance Metrics',
      description: 'Metrics for AI system performance are defined and tracked',
      category: 'Measure'
    },
    {
      id: 'measure-2.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'MEASURE-2.1',
      title: 'Bias and Fairness Testing',
      description: 'AI systems are tested for bias and fairness issues',
      category: 'Measure'
    },
    {
      id: 'manage-1.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'MANAGE-1.1',
      title: 'Risk Response',
      description: 'Identified risks are prioritized and response actions are implemented',
      category: 'Manage'
    },
    {
      id: 'manage-2.1',
      frameworkId: 'nist-ai-rmf-1.0',
      code: 'MANAGE-2.1',
      title: 'Incident Response',
      description: 'Processes exist to respond to and recover from AI incidents',
      category: 'Manage'
    }
  ]
};

/**
 * SOC2 Type II Controls
 * Requirements: 8.3
 */
export const SOC2_TYPE_II: ComplianceFramework = {
  id: 'soc2-type-ii',
  name: 'SOC2 Type II',
  version: '2017',
  requirements: [
    {
      id: 'cc6.1',
      frameworkId: 'soc2-type-ii',
      code: 'CC6.1',
      title: 'Logical and Physical Access Controls',
      description: 'Entity implements logical and physical access controls to protect information assets',
      category: 'Common Criteria'
    },
    {
      id: 'cc6.2',
      frameworkId: 'soc2-type-ii',
      code: 'CC6.2',
      title: 'Authentication and Authorization',
      description: 'Prior to issuing credentials, entity registers and authorizes new users',
      category: 'Common Criteria'
    },
    {
      id: 'cc6.6',
      frameworkId: 'soc2-type-ii',
      code: 'CC6.6',
      title: 'Encryption of Data',
      description: 'Entity implements encryption to protect data at rest and in transit',
      category: 'Common Criteria'
    },
    {
      id: 'cc7.2',
      frameworkId: 'soc2-type-ii',
      code: 'CC7.2',
      title: 'System Monitoring',
      description: 'Entity monitors system components and operations for anomalies',
      category: 'Common Criteria'
    },
    {
      id: 'cc7.3',
      frameworkId: 'soc2-type-ii',
      code: 'CC7.3',
      title: 'Security Incident Response',
      description: 'Entity evaluates security events to determine if they are security incidents',
      category: 'Common Criteria'
    },
    {
      id: 'a1.2',
      frameworkId: 'soc2-type-ii',
      code: 'A1.2',
      title: 'Availability Monitoring',
      description: 'Entity monitors system availability and performance',
      category: 'Availability'
    },
    {
      id: 'c1.1',
      frameworkId: 'soc2-type-ii',
      code: 'C1.1',
      title: 'Confidentiality Commitments',
      description: 'Entity identifies and maintains confidential information',
      category: 'Confidentiality'
    },
    {
      id: 'p3.1',
      frameworkId: 'soc2-type-ii',
      code: 'P3.1',
      title: 'Privacy Notice',
      description: 'Entity provides notice about privacy practices to data subjects',
      category: 'Privacy'
    }
  ]
};

/**
 * ISO 27001:2022 Controls
 * Requirements: 8.4
 */
export const ISO_27001_2022: ComplianceFramework = {
  id: 'iso-27001-2022',
  name: 'ISO 27001:2022',
  version: '2022',
  requirements: [
    {
      id: 'a5.1',
      frameworkId: 'iso-27001-2022',
      code: 'A.5.1',
      title: 'Policies for Information Security',
      description: 'Information security policy and topic-specific policies are defined',
      category: 'Organizational Controls'
    },
    {
      id: 'a5.7',
      frameworkId: 'iso-27001-2022',
      code: 'A.5.7',
      title: 'Threat Intelligence',
      description: 'Information relating to information security threats is collected and analyzed',
      category: 'Organizational Controls'
    },
    {
      id: 'a8.2',
      frameworkId: 'iso-27001-2022',
      code: 'A.8.2',
      title: 'Privileged Access Rights',
      description: 'Allocation and use of privileged access rights are restricted and controlled',
      category: 'Technological Controls'
    },
    {
      id: 'a8.3',
      frameworkId: 'iso-27001-2022',
      code: 'A.8.3',
      title: 'Information Access Restriction',
      description: 'Access to information and other associated assets is restricted',
      category: 'Technological Controls'
    },
    {
      id: 'a8.10',
      frameworkId: 'iso-27001-2022',
      code: 'A.8.10',
      title: 'Information Deletion',
      description: 'Information stored in systems is deleted when no longer required',
      category: 'Technological Controls'
    },
    {
      id: 'a8.16',
      frameworkId: 'iso-27001-2022',
      code: 'A.8.16',
      title: 'Monitoring Activities',
      description: 'Networks, systems and applications are monitored for anomalous behavior',
      category: 'Technological Controls'
    },
    {
      id: 'a8.24',
      frameworkId: 'iso-27001-2022',
      code: 'A.8.24',
      title: 'Use of Cryptography',
      description: 'Rules for effective use of cryptography are defined and implemented',
      category: 'Technological Controls'
    },
    {
      id: 'a8.28',
      frameworkId: 'iso-27001-2022',
      code: 'A.8.28',
      title: 'Secure Coding',
      description: 'Secure coding principles are applied to software development',
      category: 'Technological Controls'
    }
  ]
};

/**
 * GDPR 2018 Articles
 * Requirements: 8.5
 */
export const GDPR_2018: ComplianceFramework = {
  id: 'gdpr-2018',
  name: 'GDPR 2018',
  version: '2018',
  requirements: [
    {
      id: 'art5',
      frameworkId: 'gdpr-2018',
      code: 'Article 5',
      title: 'Principles Relating to Processing',
      description: 'Personal data must be processed lawfully, fairly, and transparently',
      category: 'Principles'
    },
    {
      id: 'art6',
      frameworkId: 'gdpr-2018',
      code: 'Article 6',
      title: 'Lawfulness of Processing',
      description: 'Processing is lawful only if at least one legal basis applies',
      category: 'Lawfulness'
    },
    {
      id: 'art15',
      frameworkId: 'gdpr-2018',
      code: 'Article 15',
      title: 'Right of Access',
      description: 'Data subject has right to obtain confirmation of data processing',
      category: 'Data Subject Rights'
    },
    {
      id: 'art17',
      frameworkId: 'gdpr-2018',
      code: 'Article 17',
      title: 'Right to Erasure',
      description: 'Data subject has right to obtain erasure of personal data',
      category: 'Data Subject Rights'
    },
    {
      id: 'art25',
      frameworkId: 'gdpr-2018',
      code: 'Article 25',
      title: 'Data Protection by Design',
      description: 'Implement appropriate technical and organizational measures',
      category: 'Data Protection'
    },
    {
      id: 'art32',
      frameworkId: 'gdpr-2018',
      code: 'Article 32',
      title: 'Security of Processing',
      description: 'Implement appropriate security measures including encryption',
      category: 'Security'
    },
    {
      id: 'art33',
      frameworkId: 'gdpr-2018',
      code: 'Article 33',
      title: 'Breach Notification',
      description: 'Notify supervisory authority of personal data breach within 72 hours',
      category: 'Breach Management'
    },
    {
      id: 'art35',
      frameworkId: 'gdpr-2018',
      code: 'Article 35',
      title: 'Data Protection Impact Assessment',
      description: 'Carry out impact assessment when processing likely results in high risk',
      category: 'Risk Management'
    }
  ]
};

/**
 * All built-in frameworks
 */
export const BUILT_IN_FRAMEWORKS: ComplianceFramework[] = [
  OWASP_ASI_2024,
  NIST_AI_RMF_1_0,
  SOC2_TYPE_II,
  ISO_27001_2022,
  GDPR_2018
];

/**
 * Get framework by ID
 */
export function getFrameworkById(id: string): ComplianceFramework | undefined {
  return BUILT_IN_FRAMEWORKS.find(f => f.id === id);
}

/**
 * Get all framework IDs
 */
export function getFrameworkIds(): string[] {
  return BUILT_IN_FRAMEWORKS.map(f => f.id);
}
