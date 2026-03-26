# Getting Started

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git

## Clone & Setup

```bash
# Clone the repository
git clone https://github.com/hlsitech/crowbyte.git
cd crowbyte

# Install dependencies
npm install

# Copy environment variables
cp apps/desktop/.env.example apps/desktop/.env
```

## Environment Variables

Edit `apps/desktop/.env`:

```bash
# Supabase
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Venice.ai (for AI chat)
VITE_VENICE_API_KEY="your-venice-key"

# Optional
VITE_TAVILY_API_KEY="your-tavily-key"
VITE_NVD_API_KEY="your-nvd-key"
```

## Running the Desktop App

```bash
# Development mode
npm run dev:desktop

# Or from the app directory
cd apps/desktop
npm run electron:dev
```

## Running the Website

```bash
# Development mode
npm run dev:website

# Or from the app directory
cd apps/website
npm run dev
```

## Building

```bash
# Build desktop app
npm run build:desktop

# Build website
npm run build:website

# Build everything
npm run build
```

## Database

```bash
# Push migrations to Supabase
npm run db:push

# Pull remote schema
npm run db:pull
```

## MCP Servers

```bash
# Run NVD CVE search server
npm run mcp:nvd

# Run Resend email server
npm run mcp:resend
```

## Project Structure

See [Project Structure](../PROJECT_STRUCTURE.md) for full details.

## Next Steps

- [Desktop App Development](desktop.md)
- [Website Development](website.md)
- [MCP Server Development](mcp-servers.md)
