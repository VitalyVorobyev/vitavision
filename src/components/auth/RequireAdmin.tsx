import { useAuth, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import NotFound from '../../pages/NotFound';

export function RequireAdmin({ children }: { children: ReactNode }) {
    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const { isLoaded: userLoaded, user } = useUser();
    const location = useLocation();

    if (!authLoaded || !userLoaded) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
        );
    }
    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace state={{ from: location }} />;
    }
    if (user?.publicMetadata?.role !== 'admin') {
        return <NotFound />;
    }
    return <>{children}</>;
}
