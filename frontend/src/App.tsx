import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoadingBlock } from './components/ui'
import NotFound from './pages/NotFound'
import RouteError from './pages/RouteError'

const Landing = lazy(() => import('./pages/Landing'))
const Overview = lazy(() => import('./pages/app/Overview'))
const Explore = lazy(() => import('./pages/app/Explore'))
const Results = lazy(() => import('./pages/app/Results'))
const SiteReport = lazy(() => import('./pages/app/SiteReport'))
const Atlas = lazy(() => import('./pages/app/Atlas'))
const Saved = lazy(() => import('./pages/app/Saved'))
const Methodology = lazy(() => import('./pages/app/Methodology'))
const Limitations = lazy(() => import('./pages/app/Limitations'))
const About = lazy(() => import('./pages/app/About'))

const page = (el: React.ReactNode) => <Suspense fallback={<LoadingBlock />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/', element: <Suspense fallback={<div className="min-h-dvh bg-void" />}><Landing /></Suspense>, errorElement: <RouteError /> },
  {
    path: '/app',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(<Overview />) },
      { path: 'explore', element: page(<Explore />) },
      { path: 'results', element: page(<Results />) },
      { path: 'results/:analysisId', element: page(<Results />) },
      { path: 'results/:analysisId/site/:siteId', element: page(<SiteReport />) },
      { path: 'atlas', element: page(<Atlas />) },
      { path: 'saved', element: page(<Saved />) },
      { path: 'methodology', element: page(<Methodology />) },
      { path: 'limitations', element: page(<Limitations />) },
      { path: 'about', element: page(<About />) },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
