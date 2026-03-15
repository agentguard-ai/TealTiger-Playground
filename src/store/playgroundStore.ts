import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestScenario, EvaluationResult, SessionState } from '@/types';

interface PlaygroundStore {
  // State
  policyCode: string;
  scenarios: TestScenario[];
  results: EvaluationResult[];
  selectedExample: string | null;
  isEvaluating: boolean;
  isOffline: boolean;

  // Actions
  setPolicyCode: (code: string) => void;
  addScenario: (scenario: TestScenario) => void;
  updateScenario: (id: string, updates: Partial<TestScenario>) => void;
  deleteScenario: (id: string) => void;
  setResults: (results: EvaluationResult[]) => void;
  setSelectedExample: (exampleId: string | null) => void;
  setIsEvaluating: (isEvaluating: boolean) => void;
  setIsOffline: (isOffline: boolean) => void;
  loadSessionState: (state: SessionState) => void;
  getSessionState: () => SessionState;
  reset: () => void;
}

const initialState = {
  policyCode: '',
  scenarios: [],
  results: [],
  selectedExample: null,
  isEvaluating: false,
  isOffline: false,
};

export const usePlaygroundStore = create<PlaygroundStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setPolicyCode: (code) => set({ policyCode: code }),

      addScenario: (scenario) =>
        set((state) => ({
          scenarios: [...state.scenarios, scenario],
        })),

      updateScenario: (id, updates) =>
        set((state) => ({
          scenarios: state.scenarios.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteScenario: (id) =>
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
        })),

      setResults: (results) => set({ results }),

      setSelectedExample: (exampleId) => set({ selectedExample: exampleId }),

      setIsEvaluating: (isEvaluating) => set({ isEvaluating }),

      setIsOffline: (isOffline) => set({ isOffline }),

      loadSessionState: (state) =>
        set({
          policyCode: state.policyCode,
          scenarios: state.scenarios,
          selectedExample: state.selectedExample,
        }),

      getSessionState: () => {
        const state = get();
        return {
          version: '1.0.0',
          policyCode: state.policyCode,
          scenarios: state.scenarios,
          selectedExample: state.selectedExample,
          metadata: {
            timestamp: Date.now(),
            sdkVersion: '0.2.2',
          },
        };
      },

      reset: () => set(initialState),
    }),
    {
      name: 'tealtiger-playground',
      partialize: (state) => ({
        policyCode: state.policyCode,
        scenarios: state.scenarios,
        selectedExample: state.selectedExample,
      }),
    }
  )
);
