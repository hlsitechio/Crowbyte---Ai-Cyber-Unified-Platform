import { Component, ReactNode } from "react";
import { UilExclamationTriangle, UilSync } from "@iconscout/react-unicons";
interface Props {
 children: ReactNode;
}

interface State {
 hasError: boolean;
 error: string;
}

/**
 * Error boundary for BrowserPanel — prevents webview crashes from
 * nuking the entire React tree. Shows a recovery UI instead of blank screen.
 */
export class BrowserPanelErrorBoundary extends Component<Props, State> {
 state: State = { hasError: false, error: "" };

 static getDerivedStateFromError(error: Error) {
 return { hasError: true, error: error.message };
 }

 componentDidCatch(error: Error, info: React.ErrorInfo) {
 console.error("[BrowserPanel] Crashed:", error.message, info.componentStack);
 }

 handleRetry = () => {
 this.setState({ hasError: false, error: "" });
 };

 render() {
 if (this.state.hasError) {
 return (
 <div className="flex flex-col items-center justify-center gap-3 p-6 bg-background border-l border-zinc-800 h-full min-w-[300px]">
 <UilExclamationTriangle size={32} className="text-amber-500" />
 <p className="text-xs text-zinc-400 text-center">Browser panel crashed</p>
 <p className="text-[10px] text-zinc-600 text-center max-w-[200px] break-all">{this.state.error}</p>
 <button
 onClick={this.handleRetry}
 className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
 >
 <UilSync size={12} /> Retry
 </button>
 </div>
 );
 }
 return this.props.children;
 }
}
