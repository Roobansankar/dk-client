# DK StyleHub — frontend

React 19 + Vite customer website for DK StyleHub. Talks to the Laravel API in
`../backend` and degrades to static fallback data (`src/data/`) when the API is
unavailable.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # -> dist/
npm run preview
```

Set `VITE_API_URL` in `.env` (see `.env.example`) — defaults to
`http://localhost:8000/api`.

## Layout

```
src/
├── assets/         images
├── components/
│   ├── layout/      Navbar, Footer, Container
│   ├── sections/    homepage sections
│   └── ui/          small shared primitives (FilterRow, ProductImage, …)
├── context/         Theme, Site, Catalogue, Stylists providers
├── data/            static fallback content
├── hooks/           data-fetching hooks over lib/api
├── lib/             api client
└── routes/          page components (Home, Services, Products, Gallery, …)
```

Theme is driven by `context/ThemeContext.jsx` + the CSS custom properties in
`src/index.css` (`[data-theme]` on `<html>`). Both light and dark are authored.
