import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-red-500/5 border border-red-500/20 text-center">
          <span className="material-symbols-outlined text-red-400 text-5xl mb-4">bug_report</span>
          <h2 className="text-xl font-black text-white mb-2">Ups! Terjadi Kesalahan</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Komponen ini mengalami kendala teknis. Jangan khawatir, data Anda tetap aman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
