# Maintainer Guide

This document is for developers contributing to the `@de44/dotenv` library.

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript knowledge

### Installation

```bash
# Clone the repository
git clone https://github.com/de44/dotenv.git
cd dotenv

# Install dependencies
npm install
```

### Project Structure

```
src/
  ├── Dotenv.ts      # Main Dotenv class implementation
  ├── index.ts       # Public exports
  └── zodUtils.ts    # Zod error formatting utilities
test/
  ├── setup.ts       # Global test configuration and mocks
  ├── Dotenv.test.ts # Unit tests for the Dotenv class
  ├── integration.test.ts # Integration tests for real-world scenarios
  ├── data-types.test.ts # Data type parsing tests
  ├── data-types-new.test.ts # Multi-line string contract tests
  └── example.test.ts # Usage examples and demonstrations
```

## 🧪 Testing

This project uses Jest for testing with TypeScript support. The testing setup includes:

- **Unit tests**: Test individual components and methods
- **Integration tests**: Test real-world usage scenarios
- **Mocked file system**: Tests don't require actual `.env` files
- **Coverage reporting**: Generate test coverage reports

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

### Test Structure

- `test/setup.ts` - Global test configuration and mocks
- `test/Dotenv.test.ts` - Unit tests for the Dotenv class
- `test/integration.test.ts` - Integration tests for real-world scenarios
- `test/data-types.test.ts` - Data type parsing tests
- `test/data-types-new.test.ts` - Multi-line string contract tests
- `test/example.test.ts` - Usage examples and demonstrations

### Test Coverage

The test suite covers:

- ✅ Constructor and configuration
- ✅ Environment file loading
- ✅ Profile-based loading
- ✅ Schema validation
- ✅ Error handling
- ✅ Static methods
- ✅ Real-world usage scenarios
- ✅ Data type parsing (integers, decimals, booleans)
- ✅ Multi-line string support with escaping
- ✅ Complex data structures (JSON, arrays, objects)

### Running Specific Tests

```bash
# Run only unit tests
npm test -- Dotenv.test.ts

# Run only integration tests
npm test -- integration.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should load"
```

## 🏗️ Building

The project uses `tsup` for building. Add build scripts to `package.json`:

```json
{
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "dev": "tsup --watch"
  }
}
```

Create a `tsup.config.ts` file:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
```

## 📦 Publishing

### Pre-publish Checklist

1. **Update version** in `package.json`
2. **Run tests** to ensure everything works
3. **Build the project** with `npm run build`
4. **Update CHANGELOG.md** with new features/fixes
5. **Test the built package** locally

### Publishing Commands

```bash
# Build the project
npm run build

# Test the built package
npm pack

# Publish to npm
npm publish --access public
```

## 🔧 Development Workflow

### Adding New Features

1. **Create a feature branch** from `main`
2. **Write tests first** (TDD approach)
3. **Implement the feature** in `src/Dotenv.ts`
4. **Add documentation** in README.md if needed
5. **Run tests** to ensure everything works
6. **Create a pull request**

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Use meaningful variable names
- Keep functions small and focused

### Error Handling

- Use descriptive error messages
- Include context in error objects
- Test error scenarios thoroughly
- Use Zod for validation errors

## 🐛 Debugging

### Common Issues

1. **Multi-line string parsing**: Check quote escaping and line endings
2. **Schema validation**: Verify Zod schema matches environment variables
3. **File loading**: Ensure file paths are correct and files exist
4. **TypeScript errors**: Check type definitions and imports

### Debug Mode

Enable debug logging by setting a custom logger:

```typescript
const debugLogger = {
  info: (message: string, ctx?: Record<string, unknown>) => {
    console.log(`[DEBUG] ${message}`, ctx);
  },
  error: (message: string, ctx?: Record<string, unknown>) => {
    console.error(`[DEBUG ERROR] ${message}`, ctx);
  },
};

const config = await Dotenv.load({
  filepaths: [".env"],
  schema,
  logger: debugLogger,
});
```

## 📚 Documentation

### Updating Documentation

- **README.md**: User-facing documentation (examples, API reference)
- **MAINTAINER.md**: This file (development setup, testing)
- **JSDoc comments**: Inline documentation for public APIs

### Documentation Standards

- Use clear, concise language
- Include practical examples
- Keep examples up-to-date with code
- Use consistent formatting
- Include error handling examples

## 🤝 Contributing

### Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add/update tests**
5. **Update documentation**
6. **Run the test suite**
7. **Submit a pull request**

### Commit Message Format

Use conventional commits:

```
feat: add support for custom loggers
fix: resolve multi-line string parsing issue
docs: update README with new examples
test: add integration tests for profile loading
```

### Review Process

- All PRs require review
- Tests must pass
- Documentation must be updated
- Code must follow project standards

## 🔄 Release Process

### Versioning

Follow semantic versioning (SemVer):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Steps

1. **Update version** in `package.json`
2. **Update CHANGELOG.md**
3. **Create release branch**
4. **Run full test suite**
5. **Build and test package**
6. **Merge to main**
7. **Create GitHub release**
8. **Publish to npm**

## 📞 Support

For questions or issues:

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For contributions

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.
