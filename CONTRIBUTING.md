# Contributing to Quizz

Thank you for your interest in contributing to our project! We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

Before submitting a bug report, please:

1. Check if the issue has already been reported
2. Ensure you're using the latest version of the software
3. Provide clear reproduction steps
4. Include relevant logs and error messages

### Suggesting Features

We welcome feature suggestions! Please:

1. Check if the feature has already been suggested
2. Explain the use case and why it would be beneficial
3. Provide any relevant examples or mockups

### Code Contributions

#### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/quizz.git`
3. Install dependencies: `pnpm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

#### Development Setup

- The project uses a pnpm monorepo with two workspaces: `server/` and `client/`
- Server: Express 5 + Socket.IO + SQLite backend (Node 22, CommonJS)
- Client: React 19 + Vite 7 + Tailwind CSS 4 SPA

#### Coding Standards

- Follow the existing code style and patterns
- Use TypeScript for all new code
- Follow the Biome formatting rules (run `pnpm check` before committing)
- Write clear, descriptive commit messages
- Keep changes focused and atomic

#### Testing

- While there's no formal test framework configured, please test your changes manually
- Ensure your changes don't break existing functionality
- Consider edge cases and error handling

#### Submitting Changes

1. Push your changes to your fork
2. Open a pull request against the main branch
3. Provide a clear description of your changes
4. Reference any related issues

## Development Commands

### Root Commands

- `pnpm dev` - Start both server & client in dev mode
- `pnpm build` - Build both workspaces
- `pnpm start` - Start production server only
- `pnpm typecheck` - TypeScript check both workspaces
- `pnpm lint` - Biome lint
- `pnpm format` - Biome auto-format
- `pnpm check` - Biome check + auto-fix

### Server Commands

- `pnpm --filter server dev` - Dev server with live reload
- `pnpm --filter server build` - Compile to dist/
- `pnpm --filter server start` - Run compiled server

### Client Commands

- `pnpm --filter client dev` - Vite dev server
- `pnpm --filter client build` - Typecheck then bundle

## Code Review Process

All contributions will be reviewed by project maintainers. We aim to provide timely feedback and will work with you to get your changes merged.

## Community

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions with the project and community.

## Questions?

If you have any questions about contributing, please open an issue or contact us at lwdlwd95@gmail.com.