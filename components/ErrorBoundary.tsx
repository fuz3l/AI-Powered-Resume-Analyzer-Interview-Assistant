"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React ErrorBoundary caught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-4 my-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {this.props.fallbackTitle || "Component Rendering Error"}
              </h3>
              <p className="text-xs text-rose-700">
                An isolated UI rendering exception occurred. The rest of the application remains active.
              </p>
            </div>
          </div>

          {this.state.error && (
            <pre className="p-3 rounded-xl bg-white text-[11px] font-mono text-rose-700 border border-rose-200 whitespace-pre-wrap overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex justify-end">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Recovering Component
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
