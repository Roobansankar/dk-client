import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RootLayout from './routes/RootLayout'
import Home from './routes/Home'
import About from './routes/About'
import Services from './routes/Services'
import Products from './routes/Products'
import ProductDetail from './routes/ProductDetail'
import ComboDetail from './routes/ComboDetail'
import Cart from './routes/Cart'
import Checkout from './routes/Checkout'
import Gallery from './routes/Gallery'
import Contact from './routes/Contact'
import Booking from './routes/Booking'
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
import OrderDetail from './routes/account/OrderDetail'
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
import { CartProvider } from './context/CartContext'

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
              <CartProvider>
              <VideoProvider>
                <PricingPlansProvider>
                  <ReviewsProvider>
                    <Routes>
                      <Route element={<RootLayout />}>
                        <Route index element={<Home />} />
                        <Route path="services" element={<Services />} />
                        <Route path="services/men" element={<Services key="men" gender="men" />} />
                        <Route path="services/women" element={<Services key="women" gender="women" />} />
                        <Route path="products" element={<Products />} />
                        <Route path="products/:slug" element={<ProductDetail />} />
                        <Route path="combos/:slug" element={<ComboDetail />} />
                        <Route path="cart" element={<Cart />} />
                        <Route
                          path="checkout"
                          element={
                            <RequireCustomer>
                              <Checkout />
                            </RequireCustomer>
                          }
                        />
                        <Route
                          path="checkout/now"
                          element={
                            <RequireCustomer>
                              <Checkout buyNowMode />
                            </RequireCustomer>
                          }
                        />
                        <Route
                          path="gallery"
                          element={
                            <GalleryProvider>
                              <Gallery />
                            </GalleryProvider>
                          }
                        />
                        <Route path="contact" element={<Contact />} />
                        <Route path="booking" element={<Booking />} />
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
                        <Route
                          path="account/orders/:id"
                          element={
                            <RequireCustomer>
                              <OrderDetail />
                            </RequireCustomer>
                          }
                        />
                        <Route path="about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </ReviewsProvider>
                </PricingPlansProvider>
              </VideoProvider>
              </CartProvider>
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
                {/* The staff dashboard must never be indexed. */}
                <title>Admin — DK StyleHub</title>
                <meta name="robots" content="noindex, nofollow" />
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
