# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Future features and improvements will be documented here

## [0.1.0] - 2024-12-19

### Added

- **Value Coercion**: Automatic conversion of string values to appropriate types (JSON, boolean, number, null)
- **Profile Support**: Load environment-specific configurations using the `PROFILES` environment variable
- **Enhanced Logging**: Logger interface now supports context objects for better debugging
- **Comprehensive Test Suite**: Full test coverage for all features including validation, profiles, and data types
- **JSDoc Documentation**: Complete API documentation with examples

### Features

- Load environment variables from multiple .env files
- Support for environment profiles via `PROFILES` environment variable (e.g., `PROFILES=dev,test,prod`)
- Type-safe configuration with Zod schemas
- Multi-line string parsing with triple-quote syntax (`"""`)
- Error handling with detailed Zod validation messages
- Automatic value coercion for common data types
- Minimal dependencies (Zod + lodash)

### API

- `Dotenv.load<T>(options)` - Load and validate environment variables in one step
- `Dotenv.configure(options)` - Configure and initialize a Dotenv instance
- `dotenv.get<T>(schema)` - Get validated environment variables from an existing instance
- Support for `coerceValues` option to enable automatic type conversion

## [0.0.1] - 2024-01-XX

### Added

- Initial release
- Core Dotenv class with load and configure methods
- Zod integration for schema validation
- Multi-line string support
- TypeScript type definitions
- Basic test coverage
