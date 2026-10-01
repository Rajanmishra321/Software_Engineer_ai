import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';

/**
 * Shown when the session couldn't be checked because the API didn't answer,
 * instead of silently logging the user out (which is what used to happen
 * whenever the backend was restarting or stopped).
 */
const ServerUnreachable = ({ onRetry }) => (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <i className="ri-cloud-off-line text-4xl text-slate-400"></i>
        <p className="font-medium text-slate-700">Can&apos;t reach the server</p>
        <p className="max-w-sm text-sm text-slate-500">
            You&apos;re still signed in. Make sure the backend is running at{' '}
            <code className="rounded bg-slate-200 px-1 text-slate-700">
                {import.meta.env.VITE_API_URL}
            </code>
            , then try again.
        </p>
        <Button onClick={onRetry} className="mt-1 !py-2">
            <i className="ri-refresh-line"></i>
            Try again
        </Button>
    </div>
);

/** Gate for routes that need a signed-in user. */
const UserAuth = ({ children }) => {
    const { user, loading, isServerUnreachable, retry } = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        // Only send the user to login once we know there is no session.
        if (!loading && !isServerUnreachable && !user) {
            navigate('/login');
        }
    }, [loading, isServerUnreachable, user, navigate]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Spinner size={48} className="text-indigo-500" />
            </div>
        );
    }

    if (isServerUnreachable) {
        return <ServerUnreachable onRetry={retry} />;
    }

    return user ? children : null;
};

export default UserAuth;
