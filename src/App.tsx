import { lazy, Suspense, useEffect } from 'react';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import { match, navigate, useLocation } from './router';

// Landing is in the main bundle (fast first paint); everything else loads on demand.
const Quiz = lazy(() => import('./pages/Quiz'));
const PlanReveal = lazy(() => import('./pages/PlanReveal'));
const Paywall = lazy(() => import('./pages/Paywall'));
const Legal = lazy(() => import('./pages/Legal'));
const PublicCancel = lazy(() => import('./pages/PublicCancel'));
const AppRoot = lazy(() => import('./app/AppRoot'));

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

function NotFound() {
  return (
    <main className="screen center-fill">
      <h1 className="display">Page not found</h1>
      <p>
        <a href="/">Back to the start</a>
      </p>
    </main>
  );
}

export default function App() {
  const { path } = useLocation();
  let page;
  let params: Record<string, string> | null;

  if (path === '/') page = <Landing />;
  else if (path === '/quiz') page = <Redirect to="/quiz/1" />;
  else if ((params = match('/quiz/:step', path))) page = <Quiz step={params.step} />;
  else if (path === '/plan') page = <PlanReveal />;
  else if (path === '/join') page = <Paywall />;
  else if ((params = match('/legal/:doc', path))) page = <Legal doc={params.doc} />;
  else if (path === '/cancel') page = <PublicCancel />;
  else if (path === '/welcome' || path === '/login' || path.startsWith('/login/') || path === '/app' || path.startsWith('/app/'))
    page = <AppRoot path={path} />;
  else page = <NotFound />;

  return <Suspense fallback={<Spinner />}>{page}</Suspense>;
}
