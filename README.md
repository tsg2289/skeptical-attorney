# Skeptical Attorney - Legal Practice Automation

A modern, professional website for legal practice automation services, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Modern Design**: Clean, professional design with blue gradient color scheme and soft corners
- **Responsive**: Fully responsive design that works on all devices
- **Services Dropdown**: Comprehensive services menu with nested Discovery options
- **Blog Ready**: Blog structure prepared for future articles
- **SEO Optimized**: Proper meta tags and semantic HTML structure
- **Performance**: Optimized for fast loading and smooth user experience

## Services Included

- Demand Letters
- Pleadings
- Discovery
  - Written Discovery
  - Oral Discovery
- Law and Motion
- Settlement Agreements

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Deployment

This project is configured for easy deployment on Vercel:

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Deploy automatically

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Project Structure

```
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── blog/
│       └── page.tsx
├── components/
│   ├── Header.tsx
│   └── Footer.tsx
├── public/
└── ...config files
```

## Customization

- Colors and themes can be customized in `tailwind.config.js`
- Global styles are in `app/globals.css`
- Component styles use Tailwind CSS classes

## License

Private project for Skeptical Attorney.
