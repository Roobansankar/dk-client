import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RootLayout from './routes/RootLayout'
import Home from './routes/Home'
// Route-split: Home (+ shell) is the initial bundle. Every other route is
// lazy so a first-time visitor never downloads Booking/Cart/Checkout/
// account/admin code until they actually navigate there. This is the
// single biggest initial-JS win (~60%+ smaller first load).
const About = lazy(() => import('./routes/About'))
const Services = lazy(() => import('./routes/Services'))
const Products = lazy(() => import('./routes/Products'))
const ProductDetail = lazy(() => import('./routes/ProductDetail'))
const ComboDetail = lazy(() => import('./routes/ComboDetail'))
const Cart = lazy(() => import('./routes/Cart'))
const Checkout = lazy(() => import('./routes/Checkout'))
const Gallery = lazy(() => import('./routes/Gallery'))
const Contact = lazy(() => import('./routes/Contact'))
const Booking = lazy(() => import('./routes/Booking'))
const Terms = lazy(() => import('./routes/Terms'))
const Privacy = lazy(() => import('./routes/Privacy'))
const NotFound = lazy(() => import('./routes/NotFound'))
const Login = lazy(() => import('./routes/account/Login'))
const Register = lazy(() => import('./routes/account/Register'))
const ForgotPassword = lazy(() => import('./routes/account/ForgotPassword'))
const ResetPassword = lazy(() => import('./routes/account/ResetPassword'))
const GoogleCallback = lazy(() => import('./routes/account/GoogleCallback'))
const Account = lazy(() => import('./routes/account/Account'))
const OrderDetail = lazy(() => import('./routes/account/OrderDetail'))
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
                    {/* Lazy routes need a boundary: instant (null) fallback so
                        navigation feels immediate, no spinner flash. */}
                    <Suspense fallback={null}>
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
                    </Suspense>
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
