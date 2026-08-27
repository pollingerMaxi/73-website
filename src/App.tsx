import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { listAppIdRedirects } from './domain/appCatalog'
import { HomePage } from './pages/HomePage'
import { AppDetailPage } from './pages/AppDetailPage'
import { DisclaimerPage } from './pages/DisclaimerPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {listAppIdRedirects().map(({ from, to }) => (
          <Route
            key={from}
            path={`apps/${from}`}
            element={<Navigate to={`/apps/${to}`} replace />}
          />
        ))}

        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="apps/:appId" element={<AppDetailPage />} />
          <Route path="disclaimer" element={<DisclaimerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
