import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[!] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-300">
          <div className="max-w-lg p-8 rounded-lg border border-red-500/20 bg-zinc-900 space-y-4">
            <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
            <p className="text-sm text-zinc-400">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <pre className="text-xs text-zinc-500 bg-zinc-950 p-3 rounded overflow-auto max-h-40">
              {this.state.error?.stack?.split("\n").slice(0, 5).join("\n")}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = "#/dashboard";
                window.location.reload();
              }}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
