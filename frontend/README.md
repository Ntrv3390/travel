# Travel Web Frontend

Next.js frontend application using App Router with SSR/ISR for the travel marketplace.

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable React components
- `lib/` - Utility functions and API clients
- `public/` - Static assets

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8080)

## Features

- **SSR (Server-Side Rendering):** Search results pages with latest prices
- **ISR (Incremental Static Regeneration):** Product detail pages with 60-second revalidation
- **Dynamic Routing:** `/experiences/[id]` for product pages
- **TypeScript:** Full type safety
- **SEO:** Metadata and JSON-LD support

## Pages

- `/` - Home page
- `/experiences` - List all experiences (SSR)
- `/experiences/[id]` - Experience detail page (ISR)
