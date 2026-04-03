# GitHub Actions Guide for Beginners

This guide explains GitHub Actions in simple terms and how they work with this project.

## What are GitHub Actions?

GitHub Actions automatically run tasks when you push code or create pull requests. Think of them as robots that:
- Test your code automatically
- Check for errors
- Build your application
- Deploy to servers (if configured)

They run in the cloud, so you don't need to do anything on your computer.

## Why Use GitHub Actions?

1. **Automatic Testing**: Your code is tested every time you push
2. **Catch Errors Early**: Find problems before they reach production
3. **Consistent Quality**: Everyone's code is checked the same way
4. **Save Time**: No need to run tests manually

## How They Work

1. You push code to GitHub
2. GitHub detects the push
3. GitHub Actions reads the workflow file (`.github/workflows/ci.yml`)
4. Actions run the commands (test, build, etc.)
5. You see the results in the GitHub Actions tab

## Understanding the Workflows

This project has two workflow files:

### 1. CI Workflow (`.github/workflows/ci.yml`)

**When it runs**: Every push and pull request

**What it does**:
- Tests smart contracts (compiles and runs tests)
- Lints frontend code (checks code style)
- Builds frontend (verifies it compiles)

**Result**: Green checkmark = everything passed, Red X = something failed

### 2. Deploy Contract Workflow (`.github/workflows/deploy-contract.yml`)

**When it runs**: Only when you manually trigger it

**What it does**:
- Deploys smart contract to Sepolia testnet

**Why manual**: Safety - you don't want to deploy every time you push code

## Viewing Actions

1. Go to your GitHub repository
2. Click the "Actions" tab (top menu)
3. You'll see:
   - List of all workflow runs
   - Green checkmark = success
   - Red X = failure
   - Yellow circle = in progress

4. Click on a workflow run to see details:
   - Which steps ran
   - Which steps passed/failed
   - Error messages (if any)

## Understanding Workflow Files

Workflow files are written in YAML format. Here's what the parts mean:

```yaml
name: CI                    # Name of the workflow
on:                         # When to run
  push:                     # Run on push
    branches: [ main ]      # Only on main branch

jobs:                       # What to do
  test-contracts:           # Job name
    runs-on: ubuntu-latest  # Use Ubuntu Linux
    
    steps:                  # Steps to run
      - name: Checkout      # Step name
        uses: actions/checkout@v4  # Action to use
```

## Common Actions

GitHub provides pre-built "actions" you can use:

- `actions/checkout@v4`: Gets your code from GitHub
- `actions/setup-node@v4`: Sets up Node.js
- `actions/setup-python@v4`: Sets up Python
- Many more available in the [GitHub Marketplace](https://github.com/marketplace?type=actions)

## Setting Up Secrets

For deployment, you need to store sensitive information (like private keys) as "Secrets".

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter:
   - **Name**: e.g., `PRIVATE_KEY`
   - **Value**: Your actual private key
5. Click **Add secret**

### Using Secrets in Workflows

Secrets are accessed like this:

```yaml
env:
  PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
```

The `${{ }}` syntax gets the value from GitHub Secrets.

**Important**: Never put secrets directly in workflow files. Always use GitHub Secrets.

## Troubleshooting

### Workflow Fails: "Tests failed"

- Your code has errors
- Check the Actions tab for details
- Fix the errors and push again

### Workflow Fails: "Build failed"

- TypeScript errors or linting issues
- Check the error message in Actions tab
- Fix the issues locally first: `npm run lint` or `npm run build`

### Workflow Fails: "Cannot find module"

- Missing dependency in `package.json`
- Add it and push again

### "Workflow not running"

- Check that workflow file is in `.github/workflows/`
- Ensure file has `.yml` or `.yaml` extension
- Check file syntax (YAML is sensitive to indentation)

### Deployment Fails: "Invalid private key"

- Check that you added the secret correctly
- Verify the private key has the right format (starts with `0x`)
- Ensure the account has testnet ETH

## Best Practices

1. **Test Locally First**: Run tests before pushing
   ```bash
   npm test
   npm run lint
   ```

2. **Check Actions Regularly**: Review results after pushing

3. **Fix Failures Immediately**: Don't let broken builds accumulate

4. **Use Secrets Safely**: Never commit secrets to code

5. **Keep Workflows Simple**: Start simple, add complexity later

## Customizing Workflows

Want to add your own workflow?

1. Create a new file: `.github/workflows/your-name.yml`
2. Copy the structure from `ci.yml`
3. Modify the steps for your needs
4. Push and it will run automatically

## Example: Adding a Lint Check

```yaml
name: Lint Only

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)

## Summary

- GitHub Actions = Automatic tasks that run when you push code
- CI Workflow = Tests and checks your code automatically
- Deploy Workflow = Deploys contract when you manually trigger it
- Secrets = Safe place to store sensitive information
- Always check the Actions tab after pushing code

