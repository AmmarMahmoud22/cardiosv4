import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'حدث خطأ غير متوقع في الواجهة'
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Cardios ErrorBoundary caught an error:', error, info);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">
              عذراً، حدث خطأ تقني مؤقت
            </h1>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              توقفت هذه الشاشة مؤقتاً لحماية سلامة البيانات الطبية. يمكنك إعادة تحميل المنصة بأمان للاستمرار.
            </p>
            {this.state.errorMessage && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-5 text-left font-mono break-words" dir="ltr">
                {this.state.errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={16} />
              <span>إعادة تحميل المنصة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
