import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { SiteDataProvider } from './context/SiteDataContext'
import Header from './components/Header'
import Footer from './components/Footer'
import BrandSplash from './components/BrandSplash'

const HomePage = lazy(() => import('./pages/HomePage'))
const WorksPage = lazy(() => import('./pages/WorksPage'))
const AllWorksPage = lazy(() => import('./pages/AllWorksPage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const SavedPage = lazy(() => import('./pages/SavedPage'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const AdminWorks = lazy(() => import('./pages/admin/AdminWorks'))
const AdminContact = lazy(() => import('./pages/admin/AdminContact'))
const AdminManagers = lazy(() => import('./pages/admin/AdminManagers'))

const ContactFloat = lazy(() => import('./components/ContactFloat'))

function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )
}

/** Defer floating widgets until after first paint / idle */
function DeferredFloat() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const enable = () => setReady(true)

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(enable, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }

    const t = window.setTimeout(enable, 1200)
    return () => window.clearTimeout(t)
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <ContactFloat />
    </Suspense>
  )
}

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <DeferredFloat />
    </div>
  )
}

function AdminSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

function AppShell() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <>
      <BrandSplash skip={isAdmin} />
      <Routes>
        <Route
          path="/admin/login"
          element={
            <AdminSuspense>
              <AdminLogin />
            </AdminSuspense>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminSuspense>
              <AdminLayout />
            </AdminSuspense>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="works" element={<AdminWorks />} />
          <Route path="contact" element={<AdminContact />} />
          <Route path="managers" element={<AdminManagers />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/works/all" element={<AllWorksPage />} />
          <Route path="/works/:id" element={<ProductDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/saved" element={<SavedPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <SiteDataProvider>
      <AppProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AppProvider>
    </SiteDataProvider>
  )
}
