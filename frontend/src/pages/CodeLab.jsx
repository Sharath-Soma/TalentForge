import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { AlertTriangle, CheckCircle2, Clock3, Eraser, Play, RotateCcw, TerminalSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';
import './CodeLab.css';
const STORAGE_KEY = 'talentforge_codelab_state_v1';

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python 3', editorLanguage: 'python', template: 'print("Hello, World!")' },
  {
    value: 'java',
    label: 'Java',
    editorLanguage: 'java',
    template:
      'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
  },
  {
    value: 'cpp',
    label: 'C++',
    editorLanguage: 'cpp',
    template: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}',
  },
];

const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0].value;
const DEFAULT_CODE_BY_LANGUAGE = Object.fromEntries(LANGUAGE_OPTIONS.map((option) => [option.value, option.template]));

function readStoredState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return stored && typeof stored === 'object' ? stored : null;
  } catch {
    return null;
  }
}

function getWorkspaceStatus({ loading, error, output }) {
  if (loading) {
    return { key: 'running', label: 'Running', toneClass: 'badge--warning' };
  }

  if (error || output?.stderr || output?.compile_output) {
    return { key: 'error', label: 'Error', toneClass: 'badge--danger' };
  }

  if (output) {
    return { key: 'success', label: 'Completed', toneClass: 'badge--success' };
  }

  return { key: 'idle', label: 'Idle', toneClass: '' };
}

const CodeLab = () => {
  const { theme } = useTheme();
  const [language, setLanguage] = useState(() => readStoredState()?.language || DEFAULT_LANGUAGE);
  const [codeByLanguage, setCodeByLanguage] = useState(() => ({
    ...DEFAULT_CODE_BY_LANGUAGE,
    ...(readStoredState()?.codeByLanguage || {}),
  }));
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stdin, setStdin] = useState(() => readStoredState()?.stdin || '');
  const [error, setError] = useState('');
  const consoleRef = useRef(null);

  const activeLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === language) ?? LANGUAGE_OPTIONS[0],
    [language]
  );
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';
  const code = codeByLanguage[language] ?? activeLanguage.template;
  const workspaceStatus = getWorkspaceStatus({ loading, error, output });
  const hasOutput = Boolean(output?.stdout);
  const hasErrors = Boolean(output?.stderr || output?.compile_output);
  const executionStatus = output?.status?.description || workspaceStatus.label;
  const executionTime = output?.time ? `${output.time}s` : loading ? 'Running...' : 'Not run yet';
  const executionMemory = output?.memory ? `${output.memory} KB` : 'n/a';

  useEffect(() => {
    if (!consoleRef.current) return;
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [output, loading, error]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        language,
        stdin,
        codeByLanguage,
      })
    );
  }, [language, stdin, codeByLanguage]);

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const clearConsole = () => {
    setOutput(null);
    setError('');
  };

  const clearDraft = () => {
    setCodeByLanguage(DEFAULT_CODE_BY_LANGUAGE);
    setStdin('');
    setOutput(null);
    setError('');
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput({ stderr: 'Error: source code cannot be empty.' });
      return;
    }

    setLoading(true);
    setOutput(null);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/compiler/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code, language, stdin }),
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to execute code';
        setOutput({
          ...data,
          stderr: data.stderr || errorMessage,
        });
        setError(errorMessage);
      } else {
        setOutput(data);
      }
    } catch (requestError) {
      console.error('Compiler error:', requestError);
      setError('Network error: could not connect to the compiler service.');
      setOutput({ stderr: 'Network error: could not connect to compiler.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!loading) {
          runCode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, runCode]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header__title-group">
          <span className="page-header__eyebrow">Code Lab</span>
          <h2>Test ideas, interview snippets, and compiler output in one focused workspace.</h2>
          <p className="page-header__subtitle">
            Switch languages, provide input, and inspect runtime feedback without leaving the app.
          </p>
        </div>
      </div>

      <section className="surface-card code-lab-workspace">
        <div className="code-lab-toolbar surface-card surface-card--tight">
          <div className="code-lab-toolbar__primary">
            <div className="field-group code-lab-language">
              <label htmlFor="code-language">Language</label>
              <select id="code-language" value={language} onChange={handleLanguageChange} disabled={loading}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`badge ${workspaceStatus.toneClass} code-lab-status`}>
              <span className={`code-lab-status__dot code-lab-status__dot--${workspaceStatus.key}`} />
              {workspaceStatus.label}
            </div>
          </div>

          <div className="code-lab-toolbar__meta">
            <div className="code-lab-runtime">
              <Clock3 size={14} />
              <span>Execution</span>
              <strong>{executionTime}</strong>
            </div>

            <div className="code-lab-toolbar__actions">
              <span className="code-lab-shortcut">Ctrl/Cmd + Enter</span>
              <button type="button" className="btn-ghost" onClick={clearConsole} disabled={loading && !output}>
                <Eraser size={16} />
                Clear
              </button>
              <button type="button" className="btn-ghost" onClick={clearDraft} disabled={loading}>
                <RotateCcw size={16} />
                Reset draft
              </button>
              <button type="button" className="btn-primary" onClick={runCode} disabled={loading}>
                {loading ? (
                  <>
                    <span className="button-spinner" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="code-lab-progress" aria-hidden="true">
            <span />
          </div>
        ) : null}

        <div className="code-lab-shell">
          <section className="code-lab-pane code-lab-pane--editor">
            <div className="code-lab-pane__header">
              <div>
                <span className="code-lab-pane__eyebrow">Editor</span>
                <h3>{activeLanguage.label}</h3>
              </div>
              <div className="code-lab-pane__meta">
                <span className={`badge ${workspaceStatus.toneClass}`}>{loading ? 'Executing' : 'Ready'}</span>
                <small>Auto-saved locally</small>
              </div>
            </div>

            <div className="code-lab-editor">
              <Editor
                height="100%"
                language={activeLanguage.editorLanguage}
                value={code}
                theme={editorTheme}
                options={{
                  automaticLayout: true,
                  autoIndent: 'advanced',
                  bracketPairColorization: { enabled: true },
                  fontSize: 14,
                  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                  guides: {
                    bracketPairs: true,
                    indentation: true,
                  },
                  lineNumbers: 'on',
                  matchBrackets: 'always',
                  minimap: { enabled: false },
                  padding: { top: 20, bottom: 20 },
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                }}
                onChange={(value) =>
                  setCodeByLanguage((current) => ({
                    ...current,
                    [language]: value || '',
                  }))
                }
              />
            </div>
          </section>

          <section className="code-lab-pane code-lab-pane--console">
            <div className="code-lab-pane__header">
              <div className="inline-group">
                <span className="code-lab-console-icon">
                  <TerminalSquare size={18} />
                </span>
                <div>
                  <span className="code-lab-pane__eyebrow">Console</span>
                  <h3>Execution Panel</h3>
                </div>
              </div>
              <div className="code-lab-pane__meta">
                <span className={`badge ${workspaceStatus.toneClass}`}>{executionStatus}</span>
                <button type="button" className="btn-ghost code-lab-clear-output" onClick={clearConsole} disabled={loading && !output}>
                  <Eraser size={16} />
                  Clear output
                </button>
              </div>
            </div>

            <div className="console-wrapper" ref={consoleRef}>
              {loading ? (
                <div className="console-state">
                  <div className="loader" />
                  <p>Compiling and executing your code...</p>
                </div>
              ) : output ? (
                <div className="console-output">
                  <section className="console-section console-section--output">
                    <div className="console-section__header">
                      <span className="console-label">Output</span>
                      {hasOutput ? <CheckCircle2 size={16} /> : null}
                    </div>
                    <pre className={`console-card ${hasOutput ? 'console-card--success' : ''}`}>
                      {hasOutput ? output.stdout : 'Program finished with no output.'}
                    </pre>
                  </section>

                  <section className="console-section console-section--errors">
                    <div className="console-section__header">
                      <span className="console-label">Errors</span>
                      {hasErrors ? <AlertTriangle size={16} /> : null}
                    </div>
                    <pre className={`console-card ${hasErrors ? 'console-card--error' : 'console-card--muted'}`}>
                      {output.compile_output || output.stderr || 'No runtime or compilation errors.'}
                    </pre>
                  </section>

                  <section className="console-section console-section--meta">
                    <div className="console-section__header">
                      <span className="console-label">Execution Info</span>
                    </div>
                    <div className="execution-meta">
                      <div className="execution-meta__item">
                        <span>Status</span>
                        <strong>{executionStatus}</strong>
                      </div>
                      <div className="execution-meta__item">
                        <span>Time</span>
                        <strong>{executionTime}</strong>
                      </div>
                      <div className="execution-meta__item">
                        <span>Memory</span>
                        <strong>{executionMemory}</strong>
                      </div>
                      <div className="execution-meta__item">
                        <span>Language</span>
                        <strong>{activeLanguage.label}</strong>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="console-state">
                  <p>Run your code to inspect output, runtime status, and compile feedback.</p>
                </div>
              )}
            </div>

            <div className="code-lab-input">
              <div className="code-lab-input__header">
                <h4>Custom Input</h4>
                <p className="text-muted">Provide stdin for programs that expect user input.</p>
              </div>
              <textarea
                rows={5}
                placeholder="Enter custom input here..."
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default CodeLab;
