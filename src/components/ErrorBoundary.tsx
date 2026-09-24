import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-gray-900">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">שגיאה במערכת</h1>
            <p className="text-gray-600">
              אופס! נראה שמשהו השתבש בטעינת האתר.
            </p>
            {this.state.error && (
              <div className="bg-red-50 text-red-800 p-3 rounded text-sm text-left font-mono overflow-auto max-h-32" dir="ltr">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              רענן את העמוד
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
