import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DRISHTI System Exception caught by ErrorBoundary]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#0B0D11] text-[#EAEAEA] flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-rose-500/30 bg-[#121418]/90 shadow-glass space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl glass-panel-subtle flex items-center justify-center border border-rose-500/30 text-rose-400">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h1 className="font-serif text-xl font-medium text-neutral-100">
                Operations Console Fault
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                The DRISHTI runtime encountered an unexpected UI rendering exception. Telemetry data integrity remains secure.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-24">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="btn-chrome-primary w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                aria-label="Reset Operations Console"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Operations Console</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
