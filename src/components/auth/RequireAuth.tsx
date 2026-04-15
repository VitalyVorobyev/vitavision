import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const location = useLocation();

    if (!isLoaded) return <AuthLoading />;
    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace state={{ from: location }} />;
    }
    return <>{children}</>;
}

function AuthLoading() {
    return (
        <div className="flex flex-1 items-center justify-center py-20">
            <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
    );
}
