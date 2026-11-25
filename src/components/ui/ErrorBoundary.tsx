import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@vitavision/ui";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        if (this.props.fallback) return this.props.fallback;

        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-lg font-semibold text-defect">Something went wrong</p>
                <p className="text-sm text-fg-muted max-w-md">
                    {this.state.error?.message ?? "An unexpected error occurred."}
                </p>
                <Button variant="primary" onClick={() => this.setState({ hasError: false, error: null })}>
                    Try again
                </Button>
            </div>
        );
    }
}
