import type { TestScenario } from '../../types';

/**
 * ScenarioManager - Manages CRUD operations for test scenarios
 * 
 * Provides methods to add, update, delete, and retrieve test scenarios
 * with automatic ID and timestamp generation.
 */
export class ScenarioManager {
  private scenarios: Map<string, TestScenario>;

  constructor(initialScenarios: TestScenario[] = []) {
    this.scenarios = new Map(
      initialScenarios.map(scenario => [scenario.id, scenario])
    );
  }

  /**
   * Add a new scenario with auto-generated ID and timestamp
   */
  addScenario(scenario: Omit<TestScenario, 'id' | 'timestamp'>): TestScenario {
    const newScenario: TestScenario = {
      ...scenario,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.scenarios.set(newScenario.id, newScenario);
    return newScenario;
  }

  /**
   * Update an existing scenario
   */
  updateScenario(id: string, updates: Partial<Omit<TestScenario, 'id' | 'timestamp'>>): TestScenario | null {
    const existing = this.scenarios.get(id);
    if (!existing) {
      return null;
    }

    const updated: TestScenario = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      timestamp: existing.timestamp, // Preserve original timestamp
    };

    this.scenarios.set(id, updated);
    return updated;
  }

  /**
   * Delete a scenario by ID
   */
  deleteScenario(id: string): boolean {
    return this.scenarios.delete(id);
  }

  /**
   * Get a scenario by ID
   */
  getScenario(id: string): TestScenario | undefined {
    return this.scenarios.get(id);
  }

  /**
   * Get all scenarios sorted by timestamp (newest first)
   */
  getScenarios(): TestScenario[] {
    return Array.from(this.scenarios.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  /**
   * Get scenarios count
   */
  count(): number {
    return this.scenarios.size;
  }

  /**
   * Clear all scenarios
   */
  clear(): void {
    this.scenarios.clear();
  }

  /**
   * Import scenarios from JSON
   */
  importScenarios(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);
      
      if (!Array.isArray(data)) {
        return { success: false, imported: 0, errors: ['Invalid format: expected array of scenarios'] };
      }

      for (const item of data) {
        const validationError = this.validateScenario(item);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        // Preserve ID and timestamp if present, otherwise generate new ones
        const scenario: TestScenario = {
          id: item.id || this.generateId(),
          timestamp: item.timestamp || Date.now(),
          name: item.name,
          prompt: item.prompt,
          provider: item.provider,
          model: item.model,
          parameters: item.parameters || {},
          expectedOutcome: item.expectedOutcome,
          description: item.description,
          testType: item.testType,
        };

        this.scenarios.set(scenario.id, scenario);
        imported++;
      }

      return { success: errors.length === 0, imported, errors };
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Export scenarios to JSON string
   */
  exportScenarios(): string {
    const scenarios = this.getScenarios();
    return JSON.stringify(scenarios, null, 2);
  }

  /**
   * Validate a scenario object against the TestScenario schema
   */
  private validateScenario(item: any): string | null {
    if (!item || typeof item !== 'object') {
      return 'Invalid scenario: must be an object';
    }

    if (!item.name || typeof item.name !== 'string') {
      return 'Invalid scenario: missing or invalid "name" field';
    }

    if (!item.prompt || typeof item.prompt !== 'string') {
      return 'Invalid scenario: missing or invalid "prompt" field';
    }

    const validProviders = ['openai', 'anthropic', 'gemini', 'bedrock'];
    if (!item.provider || !validProviders.includes(item.provider)) {
      return `Invalid scenario: "provider" must be one of ${validProviders.join(', ')}`;
    }

    if (!item.model || typeof item.model !== 'string') {
      return 'Invalid scenario: missing or invalid "model" field';
    }

    if (item.expectedOutcome && !['ALLOW', 'DENY', 'MONITOR'].includes(item.expectedOutcome)) {
      return 'Invalid scenario: "expectedOutcome" must be ALLOW, DENY, or MONITOR';
    }

    if (item.testType && !['pii', 'injection', 'normal'].includes(item.testType)) {
      return 'Invalid scenario: "testType" must be pii, injection, or normal';
    }

    return null;
  }

  /**
   * Generate a unique ID using timestamp and random string
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `scenario_${timestamp}_${random}`;
  }
}
