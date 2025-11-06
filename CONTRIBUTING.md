# Contributing to Vault Search Pro

First off, thank you for considering contributing to Vault Search Pro! It's people like you that make this extension better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Include your Chrome version and OS**
- **Include the extension version**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain the expected behavior**
- **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Issues that are good for newcomers
- `help wanted` - Issues that need assistance

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code follows the existing style
4. Update documentation as needed
5. Write a clear commit message

## Development Setup

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vault-search-pro.git
   cd vault-search-pro
   ```

2. **Load the extension in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

3. **Make your changes**:
   - Edit the relevant files
   - Reload the extension in Chrome to test

4. **Test thoroughly**:
   - Test all authentication methods
   - Test search functionality
   - Test on different Vault versions
   - Test error scenarios

## Pull Request Process

1. **Update the README.md** with details of changes if applicable
2. **Update the CHANGELOG.md** with your changes
3. **Update version numbers** following [SemVer](http://semver.org/)
4. **Ensure all tests pass** and no console errors
5. **Request review** from maintainers
6. **Address feedback** promptly and professionally

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/ldap-auth`)
- `fix/` - Bug fixes (e.g., `fix/token-refresh`)
- `docs/` - Documentation changes (e.g., `docs/installation-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/search-engine`)
- `test/` - Adding or updating tests (e.g., `test/auth-validation`)

## Coding Standards

### JavaScript

- Use **ES6+ syntax** where appropriate
- Follow **consistent naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes
  - `UPPER_SNAKE_CASE` for constants
- **Comment your code** where logic is complex
- Keep functions **small and focused**
- Use **meaningful variable names**

### Code Style

```javascript
// Good
async function authenticateUser(credentials) {
  try {
    const response = await validateCredentials(credentials);
    return { success: true, data: response };
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: error.message };
  }
}

// Bad
async function auth(c) {
  try {
    let r = await validate(c);
    return {s:true,d:r};
  } catch(e) {
    return {s:false};
  }
}
```

### HTML/CSS

- Use **semantic HTML5** elements
- Follow **BEM naming convention** for CSS classes
- Ensure **accessibility** (ARIA labels, keyboard navigation)
- Maintain **responsive design**

### Security

- **Never log sensitive data** (tokens, passwords)
- **Validate all inputs**
- **Sanitize user-generated content**
- **Follow principle of least privilege**
- **Use HTTPS for all API calls**

## Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi-colons, etc)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### Examples

```
feat(auth): add LDAP authentication support

Implemented LDAP authentication method with configurable mount path
and connection testing. Includes error handling and user feedback.

Closes #123
```

```
fix(search): prevent duplicate results in path scanning

Fixed issue where paths were being added multiple times during
concurrent scanning operations.

Fixes #456
```

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Extension loads without errors
- [ ] All authentication methods work
- [ ] Search returns correct results
- [ ] UI is responsive and accessible
- [ ] No console errors or warnings
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] CHANGELOG is updated

## Questions?

Don't hesitate to ask! Create an issue or reach out to the maintainers.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing! 🎉

---

**Maintainer**: Sandesh Sachdev
**Contact**: [GitHub](https://github.com/sachdev27)
