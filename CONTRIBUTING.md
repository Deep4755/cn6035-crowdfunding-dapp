# Contributing to Crowdfunding DApp

Thank you for your interest in contributing to the Crowdfunding DApp! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with the following information:

1. **Clear Title**: A concise description of the bug
2. **Description**: Detailed explanation of the issue
3. **Steps to Reproduce**: Step-by-step instructions to reproduce the bug
4. **Expected Behavior**: What you expected to happen
5. **Actual Behavior**: What actually happened
6. **Environment**:
   - Browser and version
   - MetaMask version
   - Network (localhost, Sepolia, etc.)
   - Node.js version
7. **Screenshots**: If applicable, include screenshots or error messages
8. **Additional Context**: Any other relevant information

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:

1. **Clear Title**: A concise description of the feature
2. **Description**: Detailed explanation of the proposed feature
3. **Use Case**: Why this feature would be useful
4. **Proposed Implementation**: If you have ideas on how to implement it
5. **Alternatives**: Any alternative solutions you've considered

### Pull Requests

1. **Fork the Repository**
   - Fork the repository to your GitHub account
   - Clone your fork to your local machine

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Or for bug fixes:
   ```bash
   git checkout -b fix/your-bug-fix-name
   ```

3. **Make Your Changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments where necessary
   - Update documentation if needed
   - Add or update tests if applicable

4. **Test Your Changes**
   - Test locally using the local development setup
   - Ensure all existing tests pass
   - Test on multiple browsers if UI changes are involved
   - Test with both localhost and testnet if smart contract changes are involved

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```
   Write clear, descriptive commit messages. Follow conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for code style changes (formatting, etc.)
   - `refactor:` for code refactoring
   - `test:` for adding or updating tests
   - `chore:` for maintenance tasks

   Example:
   ```
   feat: add guest mode for browsing campaigns without wallet connection
   fix: resolve insufficient funds error message display
   docs: update README with deployment instructions
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Description of changes
     - Related issues (if any)
     - Testing instructions
     - Screenshots (if UI changes)

## Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new code. Avoid `any` types when possible.
- **Naming Conventions**:
  - Use camelCase for variables and functions
  - Use PascalCase for components and types
  - Use descriptive names that explain intent
- **Comments**: Add comments for complex logic, but prefer self-documenting code
- **Formatting**: The project uses ESLint. Run `npm run lint` before committing

### Smart Contract Guidelines

- **Solidity Version**: Use Solidity 0.8.28 (as specified in `hardhat.config.ts`)
- **Security**: 
  - Always consider reentrancy attacks
  - Validate inputs thoroughly
  - Use SafeMath patterns (though not needed in 0.8+)
  - Follow checks-effects-interactions pattern
- **Gas Optimization**: Consider gas costs, but prioritize security and readability
- **Events**: Emit events for all state changes that users should be aware of
- **Testing**: Add tests for new contract functions and edge cases

### Frontend Guidelines

- **Components**: 
  - Use functional components with hooks
  - Keep components focused and reusable
  - Extract complex logic into custom hooks or utilities
- **State Management**: 
  - Use React hooks for local state
  - Pass props down, lift state up when needed
  - Consider context for global state if necessary
- **Error Handling**: 
  - Use the `errorHandler.ts` utility for blockchain errors
  - Provide user-friendly error messages
  - Always handle edge cases and network failures
- **Accessibility**: 
  - Use semantic HTML
  - Ensure keyboard navigation works
  - Add appropriate ARIA labels when needed
- **Performance**: 
  - Use `useCallback` and `useMemo` when appropriate
  - Avoid unnecessary re-renders
  - Optimize images and assets

### File Structure

- **Smart Contracts**: Place in `contracts/`
- **Deployment Scripts**: Place in `scripts/`
- **Tests**: Place in `test/` for contracts
- **Frontend Components**: Place in `frontend/src/components/`
- **Utilities**: Place in `frontend/src/utils/`
- **Types**: Place in `frontend/src/types.ts` or component-specific files
- **Constants**: Place in `frontend/src/constants/`

### Testing

- **Smart Contracts**: Write tests in `test/` directory using Hardhat
- **Frontend**: Manually test UI changes across different browsers and devices
- **Integration**: Test the full flow (create campaign, add rewards, contribute, withdraw, refund)

## Commit Message Guidelines

Write clear, concise commit messages:

1. **Subject Line**: 
   - First line should be 50 characters or less
   - Use imperative mood ("Add feature" not "Added feature")
   - Start with type prefix (feat, fix, docs, etc.)

2. **Body** (if needed):
   - Explain what and why, not how
   - Wrap at 72 characters
   - Separate from subject with blank line

Example:
```
feat: add balance validation before transactions

Add pre-transaction balance checks to prevent failed
transactions due to insufficient funds. This improves
user experience by showing clear error messages before
attempting transactions.
```

## Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Ensure all checks pass (if CI/CD is set up)
4. Once approved, a maintainer will merge your PR

## Getting Help

If you need help:

1. Check existing issues and pull requests
2. Review the README for setup instructions
3. Open a new issue with the "question" label
4. Be specific about what you're trying to achieve and what problems you're facing

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC).

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Project documentation (if applicable)
- Release notes (for significant contributions)

Thank you for contributing to the Crowdfunding DApp!

