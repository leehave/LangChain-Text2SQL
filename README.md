# LangChain Chatbot

A full-stack chatbot application built with LangChainJS, NestJS, React, and Ant Design X.

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **LangChain** - LLM application framework
- **Anthropic Claude** - AI model integration
- **DeepSeek** - Additional AI model support

### Frontend
- **React 18** - UI library
- **Ant Design X** - AI-focused UI components
- **Zustand** - State management
- **Vite** - Build tool

### Infrastructure
- **pnpm workspaces** - Monorepo management
- **TypeScript** - Type safety across the stack

## Project Structure

```
.
├── apps/
│   ├── server/          # NestJS backend
│   │   ├── src/chat/    # Chat module (controllers, services)
│   │   ├── src/upload/  # File upload module
│   │   └── src/config/  # Configuration
│   └── web/             # React frontend
│       ├── src/components/  # UI components
│       ├── src/hooks/       # Custom hooks
│       ├── src/services/    # API services
│       └── src/stores/      # State stores
├── packages/
│   └── shared/          # Shared types and utilities
└── package.json         # Root workspace configuration
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment files and configure them:

```bash
# Server configuration
cp apps/server/.env.example apps/server/.env

# Web configuration
cp apps/web/.env.example apps/web/.env
```

Edit the `.env` files with your API keys and configuration.

### 3. Run Development Servers

Start all services in parallel:

```bash
pnpm dev
```

Or run individually:

```bash
# Backend only
pnpm dev:server

# Frontend only
pnpm dev:web
```

### 4. Build for Production

```bash
# Build all packages
pnpm build

# Build specific apps
pnpm build:server
pnpm build:web
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm dev:web` | Start web frontend only |
| `pnpm dev:server` | Start backend server only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run linting across all packages |
| `pnpm typecheck` | Run TypeScript type checking |

## Features

- **AI Chat Interface** - Interactive chat with LLM models
- **Multi-Model Support** - Claude and DeepSeek integration
- **Chat History** - Persistent conversation storage
- **File Upload** - Document upload and processing
- **Code Highlighting** - Syntax highlighting for code blocks
- **Real-time Streaming** - Streaming responses from AI models

## License

ISC
