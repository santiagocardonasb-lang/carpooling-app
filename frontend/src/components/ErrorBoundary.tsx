import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || 'Error desconocido' };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-white font-black text-xl mb-2">Algo salió mal</h1>
          <p className="text-zinc-500 text-sm mb-6 max-w-xs">{this.state.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/'; }}
            className="bg-white text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-zinc-200 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
