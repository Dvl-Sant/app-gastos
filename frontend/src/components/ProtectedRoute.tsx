import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getSession } from '../auth/session';

interface Props {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
    if (!getSession()) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
}
