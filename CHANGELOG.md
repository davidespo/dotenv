# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of @de44/dotenv
- TypeScript-first environment variable loader
- Zod schema validation support
- Multi-line string support with proper escaping
- Environment profile loading
- Customizable logging
- Comprehensive test suite
- JSDoc documentation

### Features

- Load environment variables from multiple .env files
- Support for environment profiles (e.g., .env.dev, .env.prod)
- Type-safe configuration with Zod schemas
- Multi-line string parsing with quote escaping
- Error handling with detailed Zod validation messages
- Zero dependencies (except Zod)

## [0.0.1] - 2024-01-XX

### Added

- Initial release
- Core Dotenv class with load and configure methods
- Zod integration for schema validation
- Multi-line string support
- TypeScript type definitions
- Comprehensive test coverage
