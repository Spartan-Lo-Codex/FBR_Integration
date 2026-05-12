### FBR Integration

FBR Integration for ERPNext — integrates with FBR's Digital Invoicing (DI) system to submit sales invoices directly to FBR.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd ~/frappe-bench
bench get-app fbr_integration https://github.com/ERPNEXT-PAKISTAN/FBR_Integration.git --branch main
bench --site site1.local install-app fbr_integration
bench --site site1.local migrate
bench build --app fbr_integration
bench restart
```

### Updating an Existing Installation

If you already have the app installed and want to pull the latest changes:

```bash
cd ~/frappe-bench

# Pull latest code
bench get-app fbr_integration https://github.com/ERPNEXT-PAKISTAN/FBR_Integration.git --branch main

# Run database migrations (for any new doctypes/fields)
bench --site site1.local migrate

# Rebuild JS/CSS assets
bench build --app fbr_integration

# Clear cache and restart
bench --site site1.local clear-cache
bench restart
```

> **Tip:** If `bench get-app` reports the app is already present, pull manually:
> ```bash
> cd ~/frappe-bench/apps/fbr_integration
> git pull origin main
> cd ~/frappe-bench
> bench --site site1.local migrate
> bench build --app fbr_integration
> bench --site site1.local clear-cache
> bench restart
> ```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/fbr_integration
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app and runs unit tests on every push to `develop` branch.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.


### License

mit
