import { useEffect, useState, lazy, Suspense } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { ExampleLibrary } from './components/Examples/ExampleLibrary';
import { PolicyEditor } from './components/Editor/PolicyEditor';
import { ScenarioList } from './components/Scenarios/ScenarioList';
import { ScenarioEditor } from './components/Scenarios/ScenarioEditor';
import { ResultDisplay } from './components/Results/ResultDisplay';
import { WelcomeModal } from './components/Modals/WelcomeModal';
import { ShareModal } from './components/Modals/ShareModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { usePlaygroundStore } from './store/playgroundStore';
import { useEvaluation } from './hooks/useEvaluation';
import { useURLState } from './hooks/useURLState';
import type { ExamplePolicy } from './examples';
import type { TestScenario } from './types';

const VisualPolicyBuilder = lazy(() => import('./components/VisualPolicyBuilder/VisualPolicyBuilder'));

type AppMode = 'code' | 'visual';

function App() {
  const {
    policyCode,
    scenarios,
    selectedExample,
    setPolicyCode,
    addScenario,
    updateScenario,
    deleteScenario,
    setSelectedExample,
    loadSessionState,
    getSessionState,
  } = usePlaygroundStore();

  const { results, isEvaluating, totalExecutionTime, runEvaluation } = useEvaluation();
  const { loadFromURL, saveToURL, copyShareableURL } = useURLState();

  // Modal states
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isTruncated, setIsTruncated] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('code');

  // Scenario editor state
  const [isScenarioEditorOpen, setIsScenarioEditorOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<TestScenario | null>(null);

  // Load state from URL on mount
  useEffect(() => {
    const urlState = loadFromURL();
    if (urlState) {
      loadSessionState(urlState);
    } else {
      // Show welcome modal if not dismissed
      const dismissed = localStorage.getItem('tealtiger-playground-welcome-dismissed');
      if (!dismissed) {
        setIsWelcomeOpen(true);
      }
    }
  }, []);

  // Save state to URL when it changes
  useEffect(() => {
    if (policyCode || scenarios.length > 0) {
      const state = getSessionState();
      saveToURL(state);
    }
  }, [policyCode, scenarios]);

  // Handle example selection
  const handleSelectExample = (example: ExamplePolicy) => {
    setPolicyCode(example.code);
    setSelectedExample(example.id);
    
    // Load example scenarios - they already have id and timestamp
    example.scenarios.forEach((scenario) => {
      addScenario(scenario);
    });
  };

  // Handle scenario creation/editing
  const handleSaveScenario = (scenarioData: Omit<TestScenario, 'id' | 'timestamp'>) => {
    if (editingScenario) {
      // Update existing scenario
      updateScenario(editingScenario.id, scenarioData);
    } else {
      // Create new scenario
      const newScenario: TestScenario = {
        id: `scenario-${Date.now()}`,
        timestamp: Date.now(),
        ...scenarioData,
      };
      addScenario(newScenario);
    }
    setEditingScenario(null);
  };

  const handleEditScenario = (scenario: TestScenario) => {
    setEditingScenario(scenario);
    setIsScenarioEditorOpen(true);
  };

  const handleAddScenario = () => {
    setEditingScenario(null);
    setIsScenarioEditorOpen(true);
  };

  // Handle evaluation
  const handleEvaluate = () => {
    if (scenarios.length === 0) {
      alert('Please add at least one test scenario');
      return;
    }
    runEvaluation(policyCode, scenarios);
  };

  // Handle share
  const handleShare = async () => {
    const state = getSessionState();
    const { url, truncated } = await copyShareableURL(state);
    setShareUrl(url);
    setIsTruncated(truncated);
    setIsShareOpen(true);
  };

  // Handle import
  const handleImport = (importedScenarios: TestScenario[]) => {
    importedScenarios.forEach((scenario) => {
      addScenario({
        ...scenario,
        id: `imported-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      });
    });
  };

  // Sidebar content
  const sidebar = (
    <div className="space-y-6">
      {/* Example Library */}
      <ExampleLibrary
        onSelectExample={handleSelectExample}
        selectedExampleId={selectedExample || undefined}
      />

      {/* Scenarios Section */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Test Scenarios</h2>
          <button
            onClick={handleAddScenario}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
          >
            + Add
          </button>
        </div>
        <ScenarioList
          scenarios={scenarios}
          onEdit={handleEditScenario}
          onDelete={deleteScenario}
        />
      </div>
    </div>
  );

  // Editor content with evaluation button
  const editor = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900">Policy Editor</h2>
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating || scenarios.length === 0}
          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isEvaluating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Evaluating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Run Evaluation
            </>
          )}
        </button>
      </div>
      <div className="flex-1">
        <PolicyEditor onEvaluate={handleEvaluate} />
      </div>
    </div>
  );

  // Results content
  const resultsContent = (
    <ResultDisplay
      results={results}
      isEvaluating={isEvaluating}
      totalExecutionTime={totalExecutionTime}
    />
  );

  return (
    <>
      {/* Mode Toggle Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3">
        <span className="text-gray-400 text-sm font-medium">Mode:</span>
        <button
          onClick={() => setAppMode('code')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            appMode === 'code'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Code Playground
        </button>
        <button
          onClick={() => setAppMode('visual')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
            appMode === 'visual'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Visual Builder
        </button>
      </div>

      {appMode === 'visual' ? (
        <div style={{ height: 'calc(100vh - 44px)' }}>
          <Suspense fallback={
            <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
              Loading Visual Policy Builder...
            </div>
          }>
            <VisualPolicyBuilder />
          </Suspense>
        </div>
      ) : (
        <>
          <MainLayout
            sidebar={sidebar}
            editor={editor}
            results={resultsContent}
            onShare={handleShare}
            onExport={() => setIsImportExportOpen(true)}
          />

          {/* Modals */}
          <WelcomeModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} />
          
          <ShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            shareUrl={shareUrl}
            isTruncated={isTruncated}
          />
          
          <ImportExportModal
            isOpen={isImportExportOpen}
            onClose={() => setIsImportExportOpen(false)}
            scenarios={scenarios}
            onImport={handleImport}
          />
          
          <ScenarioEditor
            scenario={editingScenario}
            isOpen={isScenarioEditorOpen}
            onClose={() => {
              setIsScenarioEditorOpen(false);
              setEditingScenario(null);
            }}
            onSave={handleSaveScenario}
          />
        </>
      )}
    </>
  );
}

export default App;
