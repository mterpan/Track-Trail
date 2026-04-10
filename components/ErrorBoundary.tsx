import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare state: State;
  declare props: Props;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database Error: ${parsed.error}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4 font-sans">
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-[#e8e4dc] max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#2d2a26] font-serif mb-2">Something went wrong</h1>
            <p className="text-[#6b665e] mb-8 leading-relaxed">
              {isFirestoreError 
                ? "We encountered a problem connecting to the database. Please check your connection and try again."
                : errorMessage}
            </p>
            
            <Button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl h-12"
            >
              Reload Page
            </Button>
            
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-[#6b665e] cursor-pointer hover:text-[#2d2a26] transition-colors">
                  Technical Details
                </summary>
                <pre className="mt-2 p-4 bg-[#faf8f5] rounded-xl text-[10px] text-[#6b665e] overflow-auto max-h-32 border border-[#e8e4dc]">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
