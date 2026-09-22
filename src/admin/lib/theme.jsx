// The admin area shares the site-wide theme (one ThemeProvider, mounted once
// at the app root) instead of running its own light/dark state + localStorage
// key. This re-export keeps every existing admin `from '../lib/theme'` /
// `from './theme'` import working unchanged.
export { ThemeProvider, useTheme } from '../../context/ThemeContext'
