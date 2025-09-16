# Cleanup Analysis Tools

This directory contains scripts for analyzing and cleaning up the project by identifying unused dependencies, dead code, and other cleanup opportunities.

## Scripts

### 1. dependency-scanner.js
Analyzes project dependencies to identify unused and missing dependencies.

**Features:**
- Detects unused dependencies and dev dependencies
- Identifies missing dependencies
- Scans for dynamic imports to avoid removing dynamically loaded dependencies
- Provides validation before suggesting removals

**Usage:**
```bash
# Run full dependency analysis
node scripts/dependency-scanner.js report

# Or use npm script
pnpm cleanup:scan-deps

# Individual commands
node scripts/dependency-scanner.js unused
node scripts/dependency-scanner.js missing
node scripts/dependency-scanner.js dynamic
```

### 2. dead-code-detector.js
Runs multiple dead code analysis tools and consolidates results.

**Features:**
- Runs knip, ts-prune, and unimported tools
- Detects dynamic require() and import() statements
- Consolidates results from all tools
- Filters safe-to-remove vs should-keep items

**Usage:**
```bash
# Run full dead code analysis
node scripts/dead-code-detector.js report

# Or use npm script
pnpm cleanup:scan-dead-code

# Individual commands
node scripts/dead-code-detector.js knip
node scripts/dead-code-detector.js ts-prune
node scripts/dead-code-detector.js unimported
node scripts/dead-code-detector.js dynamic
```

### 3. cleanup-analyzer.js
Comprehensive analyzer that combines both dependency and dead code analysis.

**Features:**
- Runs both dependency and dead code analysis
- Provides comprehensive summary with priorities
- Generates actionable cleanup scripts
- Saves detailed reports to JSON files

**Usage:**
```bash
# Run comprehensive analysis
node scripts/cleanup-analyzer.js full

# Or use npm script
pnpm cleanup:analyze

# Generate cleanup script
pnpm cleanup:generate-script

# Save detailed report
node scripts/cleanup-analyzer.js save
```

## Package.json Scripts

The following scripts are available in package.json:

```bash
# Individual analysis
pnpm cleanup:scan-deps          # Dependency analysis only
pnpm cleanup:scan-dead-code     # Dead code analysis only
pnpm cleanup:scan-all           # Both analyses separately

# Comprehensive analysis
pnpm cleanup:analyze            # Full analysis with summary
pnpm cleanup:generate-script    # Generate cleanup script
```

## Output Files

- `cleanup-analysis-report.json` - Detailed analysis results
- `cleanup-script.sh` - Generated cleanup script (review before running)

## Requirements

The following tools must be installed (already in devDependencies):
- `depcheck` - Dependency analysis
- `knip` - Dead code detection
- `ts-prune` - Unused TypeScript exports
- `unimported` - Unimported modules

## Configuration Files

- `.unimportedrc.json` - Configuration for unimported tool
- `tsconfig.json` - TypeScript configuration (affects analysis)

## Safety Features

- **Dynamic Import Detection**: Prevents removal of dynamically loaded dependencies
- **Validation**: Cross-references findings before suggesting removals
- **Dry Run**: Generate scripts for review before execution
- **Backup Recommendations**: Always test after cleanup

## Example Workflow

1. Run comprehensive analysis:
   ```bash
   pnpm cleanup:analyze
   ```

2. Review the recommendations and priorities

3. Install missing dependencies first:
   ```bash
   pnpm add @jest/globals @testing-library/react-hooks @testing-library/react-native
   ```

4. Remove unused dependencies:
   ```bash
   pnpm remove @babel/runtime @react-native-community/slider expo-blur expo-crypto expo-system-ui react-native-gesture-handler react-native-web @types/jest
   ```

5. Test the application to ensure everything still works

6. Optionally clean up unused exports using ts-prune output for guidance