# Testing the Node SMTP Email Service

This document outlines the testing approach and instructions for the Node SMTP Email Service application.

## Testing Approach

The application uses Jest and React Testing Library for testing, which is the recommended approach for Next.js applications. The testing setup includes:

1. **Unit Tests**: Testing individual components and functions in isolation
2. **API Tests**: Testing the API endpoints directly
3. **Integration Tests**: Testing the interaction between components and API calls

## Test Structure

Tests are organized in the following structure:

```javascript
/tests
  /api
    - email.test.js         # Tests for the email API endpoint
    - password-update.test.js  # Specific tests for password updates
  /pages
    - index.test.jsx        # Tests for the main page component
  /integration
    - full-flow.test.js     # End-to-end integration tests
```

## Setting Up Testing Environment

To set up the testing environment, the following files have been created:

- `jest.config.js`: Configuration for Jest
- `jest.setup.js`: Setup file for Jest, including global mocks

## Running Tests

To run the tests, you need to install the required dependencies:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom node-mocks-http jest-environment-jsdom
```

Then you can run the tests using the following commands:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run a specific test file
npm test -- tests/api/email.test.js
```

## Manual Testing

In addition to the automated tests, you can manually test the application by:

1. Starting the development server:

   ```bash
   vercel dev
   ```

2. Using the UI in the browser at <http://localhost:3000>
3. Making API requests directly to the endpoints

## Testing Best Practices

1. **Mock External Dependencies**: Always mock external dependencies like `fetch` and environment variables.
2. **Test Edge Cases**: Include tests for error conditions and edge cases.
3. **Isolate Tests**: Each test should be independent and not rely on the state from other tests.
4. **Use Descriptive Names**: Test names should clearly describe what is being tested.
5. **Follow AAA Pattern**: Arrange, Act, Assert - set up the test, perform the action, check the results.

## Debugging Tests

If tests are failing, you can use the following techniques to debug:

1. Use `console.log` statements in your tests
2. Run tests with the `--verbose` flag: `npm test -- --verbose`
3. Run a single test with the `--watch` flag: `npm test -- tests/api/email.test.js --watch`
4. Use the browser console when running the manual test scripts

## Continuous Integration

For continuous integration, you can add a GitHub Actions workflow to run tests automatically on each push or pull request.

Example `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16.x'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
