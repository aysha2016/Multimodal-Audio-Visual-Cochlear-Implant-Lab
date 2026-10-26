import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold">!</span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 mb-2">
              CI-AI Research Lab Recovery
            </h1>
            <p className="text-xs text-slate-300 mb-4">
              The application encountered an unexpected runtime state. You can reload to restore baseline research parameters.
            </p>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg text-left text-[11px] font-mono text-red-300 mb-4 overflow-x-auto border border-slate-800">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global window error catch to prevent unhandled runtime errors from freezing the page
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.warn('Global captured error:', event.message, event.filename);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Global unhandled rejection:', event.reason);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
