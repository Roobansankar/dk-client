import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RootLayout from './routes/RootLayout'
import Home from './routes/Home'
import Services from './routes/Services'
import Products from './routes/Products'
import ProductDetail from './routes/ProductDetail'
import Gallery from './routes/Gallery'
import Contact from './routes/Contact'
import Terms from './routes/Terms'
import Privacy from './routes/Privacy'
import NotFound from './routes/NotFound'
import Login from './routes/account/Login'
import Register from './routes/account/Register'
import ForgotPassword from './routes/account/ForgotPassword'
import ResetPassword from './routes/account/ResetPassword'
import GoogleCallback from './routes/account/GoogleCallback'
import Account from './routes/account/Account'
import RequireCustomer from './routes/account/RequireCustomer'
import { ThemeProvider } from './context/ThemeContext'
import { SiteProvider } from './context/SiteContext'
import { AuthProvider } from './context/AuthContext'
import { CatalogueProvider } from './context/CatalogueContext'
import { StylistsProvider } from './context/StylistsContext'
import { ProductsProvider } from './context/ProductsContext'
import { GalleryProvider } from './context/GalleryContext'
import { VideoProvider } from './context/VideoContext'
import { PricingPlansProvider } from './context/PricingPlansContext'
import { ReviewsProvider } from './context/ReviewsContext'

// Code-split: public visitors never download the admin bundle (JS or CSS),
// and the admin area never mounts the public site's data providers below.
const AdminApp = lazy(() => import('./admin/App'))

function PublicShell() {
  return (
    <AuthProvider>
      <SiteProvider>
        <CatalogueProvider>
          <StylistsProvider>
            <ProductsProvider>
              <VideoProvider>
                <PricingPlansProvider>
                  <ReviewsProvider>
                    <Routes>
                      <Route element={<RootLayout />}>
                        <Route index element={<Home />} />
                        <Route path="services" element={<Services />} />
                        <Route path="products" element={<Products />} />
                        <Route path="products/:slug" element={<ProductDetail />} />
                        <Route
                          path="gallery"
                          element={
                            <GalleryProvider>
                              <Gallery />
                            </GalleryProvider>
                          }
                        />
                        <Route path="contact" element={<Contact />} />
                        <Route path="terms" element={<Terms />} />
                        <Route path="privacy" element={<Privacy />} />
                        <Route path="login" element={<Login />} />
                        <Route path="register" element={<Register />} />
                        <Route path="forgot-password" element={<ForgotPassword />} />
                        <Route path="reset-password" element={<ResetPassword />} />
                        <Route path="auth/google/callback" element={<GoogleCallback />} />
                        <Route
                          path="account"
                          element={
                            <RequireCustomer>
                              <Account />
                            </RequireCustomer>
                          }
                        />
                        {/* About lives on the homepage; keep /about working as a link target. */}
                        <Route
                          path="about"
                          element={<Navigate to={{ pathname: '/', hash: '#about' }} replace />}
                        />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </ReviewsProvider>
                </PricingPlansProvider>
              </VideoProvider>
            </ProductsProvider>
          </StylistsProvider>
        </CatalogueProvider>
      </SiteProvider>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={null}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route path="/*" element={<PublicShell />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
