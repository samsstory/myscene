import React, { Component, ErrorInfo, ReactNode } from "react";
import SceneLogo from "@/components/ui/SceneLogo";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  submitting: boolean;
  submitted: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null, submitting: false, submitted: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReport = async () => {
    this.setState({ submitting: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Can't report without auth — just reload
        window.location.reload();
        return;
      }

      const errorContext = {
        stack: this.state.error?.stack?.slice(0, 2000),
        componentStack: this.state.errorInfo?.componentStack?.slice(0, 2000),
        message: this.state.error?.message,
      };

      await supabase.from("bug_reports" as any).insert({
        user_id: session.user.id,
        description: `[Auto] App crashed: ${this.state.error?.message || "Unknown error"}`,
        page_url: window.location.pathname,
        user_agent: navigator.userAgent,
        device_info: {
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          platform: navigator.platform,
        },
        type: "crash",
        error_context: errorContext,
      } as any);

      this.setState({ submitted: true });
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center px-8">
        <div className="text-center max-w-sm">
          <div className="mb-6">
            <SceneLogo size="lg" className="text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Something broke</h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Help us fix it by sharing what happened. We'll include the error details automatically.
          </p>
          {this.state.submitted ? (
            <p className="text-sm text-primary">Thanks! Reloading…</p>
          ) : (
            <Button
              onClick={this.handleReport}
              disabled={this.state.submitting}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {this.state.submitting ? "Sending…" : "Send Report & Reload"}
            </Button>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
