# Test Organization

This directory contains all tests for the `@de44/dotenv` library, organized by test type and functionality.

## Directory Structure

```
test/
├── setup.ts                    # Test setup and mocks
├── unit/                       # Unit tests for individual components
│   └── Dotenv.test.ts         # Core Dotenv class functionality
├── features/                   # Feature-specific tests
│   ├── data-types.test.ts     # Data type parsing and validation
│   ├── profiles.test.ts       # Environment profiles functionality
│   ├── validation.test.ts     # Schema validation tests
│   └── logging.test.ts        # Logging functionality tests
├── integration/                # Integration tests
│   └── real-world.test.ts     # Real-world usage scenarios
└── examples/                   # Example-based tests
    ├── basic-usage.test.ts    # Basic usage examples
    └── advanced-usage.test.ts # Advanced usage examples
```

## Test Categories

### Unit Tests (`unit/`)

Tests for individual components and methods in isolation. These tests focus on the core functionality of the `Dotenv` class.

### Feature Tests (`features/`)

Tests organized by specific features of the library:

- **Data Types**: Tests for parsing different data types (strings, numbers, booleans, arrays, objects)
- **Profiles**: Tests for environment profile functionality
- **Validation**: Tests for schema validation using Zod
- **Logging**: Tests for logging functionality and custom loggers

### Integration Tests (`integration/`)

Tests that verify how different parts of the system work together in real-world scenarios.

### Example Tests (`examples/`)

Tests that demonstrate usage patterns and serve as documentation:

- **Basic Usage**: Simple examples for getting started
- **Advanced Usage**: Complex scenarios and patterns

## Test Setup

The `setup.ts` file contains:

- Jest configuration and mocks
- File system mocking for `fs/promises`
- Console method mocking to reduce test noise
- Environment variable cleanup between tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

## Adding New Tests

When adding new tests, follow these guidelines:

1. **Unit tests**: Place in `unit/` directory
2. **Feature tests**: Place in `features/` directory, grouped by feature
3. **Integration tests**: Place in `integration/` directory
4. **Example tests**: Place in `examples/` directory

### Naming Convention

- Test files should end with `.test.ts`
- Use descriptive names that indicate what is being tested
- Group related tests in the same file

### Test Structure

- Use descriptive `describe` blocks to group related tests
- Use clear, action-oriented test names in `it` blocks
- Follow the Arrange-Act-Assert pattern
- Clean up environment variables in `beforeEach` or `afterEach` hooks

## Mocking

The test suite uses Jest mocks for:

- File system operations (`fs/promises`)
- Console methods (to reduce test noise)
- Environment variables (cleaned up between tests)

## Coverage

Tests should aim for high coverage of:

- Core functionality
- Edge cases and error conditions
- Different usage patterns
- Integration scenarios
