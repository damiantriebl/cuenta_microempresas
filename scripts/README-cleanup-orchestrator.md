# Cleanup Orchestrator

The Cleanup Orchestrator is a comprehensive tool that coordinates all project cleanup operations with built-in backup, rollback, and validation capabilities.

## Features

- **Comprehensive Cleanup**: Orchestrates all cleanup tools (dependencies, dead code, assets, configurations, scripts)
- **Backup System**: Automatic git branch or filesystem backup before making changes
- **Rollback Support**: Ability to rollback individual steps or entire cleanup process
- **Dry Run Mode**: Preview changes without applying them
- **Progress Reporting**: Real-time progress updates and detailed logging
- **Validation Checkpoints**: Automatic validation after each cleanup step

## Usage

### Basic Usage

```bash
# Dry run (preview changes only)
node scripts/cleanup-orchestrator.js

# Apply changes with backup protection
node scripts/cleanup-orchestrator.js --apply

# Apply changes without backup (not recommended)
node scripts/cleanup-orchestrator.js --apply --no-backup
```

### Advanced Options

```bash
# Verbose output
node scripts/cleanup-orchestrator.js --apply --verbose

# Skip specific steps
node scripts/cleanup-orchestrator.js --apply --skip "Manage Assets,Organize Scripts"

# Use filesystem backup instead of git
node scripts/cleanup-orchestrator.js --apply --no-git

# Custom log file
node scripts/cleanup-orchestrator.js --apply --log custom-cleanup.log
```

### Rollback

```bash
# Rollback all changes to initial state
node scripts/cleanup-orchestrator.js rollback
```

## Cleanup Steps

The orchestrator executes the following steps in order:

1. **Setup Analysis Tools** - Configure TypeScript strict mode and analysis tools
2. **Analyze Dependencies** - Identify unused and missing dependencies
3. **Detect Dead Code** - Find unused files, exports, and imports
4. **Manage Assets** - Remove unused assets from the project
5. **Cleanup Configurations** - Normalize Expo, EAS, and Firebase configurations
6. **Organize Scripts** - Clean up development scripts and package.json
7. **Validate Cleanup** - Ensure project still compiles and builds correctly

## Backup System

### Git Backup (Default)
- Creates a backup branch before cleanup
- Each step creates a git checkpoint
- Automatic rollback on validation failures
- Clean removal of backup branch on success

### Filesystem Backup (Fallback)
- Creates timestamped backup directory
- Copies all important files before cleanup
- Step-by-step checkpoints in subdirectories
- Manual cleanup of backup files

## Safety Features

- **Dry Run Default**: Always runs in preview mode unless `--apply` is specified
- **Automatic Validation**: TypeScript compilation check after each step
- **Rollback on Failure**: Automatic rollback if validation fails
- **Graceful Shutdown**: Handles interruption signals properly
- **Detailed Logging**: Complete audit trail of all operations

## Output Files

- `cleanup-orchestrator.log` - Detailed execution log
- `cleanup-report-[timestamp].json` - Comprehensive cleanup report
- `backup-manifest-[id].json` - Backup system manifest

## Error Handling

- Non-critical steps continue on failure with warnings
- Critical steps (TypeScript setup, validation) stop execution on failure
- Automatic rollback attempts on step failures
- Detailed error reporting with stack traces

## Requirements

All individual cleanup tools must be available:
- `dependency-scanner.js`
- `dead-code-detector.js`
- `asset-manager.js`
- `expo-config-cleaner.js`
- `eas-config-optimizer.js`
- `firebase-config-normalizer.js`
- `debug-script-organizer.js`
- `package-script-cleaner.js`

## Examples

### Complete Cleanup with Backup
```bash
# Preview what will be cleaned
node scripts/cleanup-orchestrator.js --verbose

# Apply cleanup with full backup protection
node scripts/cleanup-orchestrator.js --apply --verbose

# If something goes wrong, rollback
node scripts/cleanup-orchestrator.js rollback
```

### Selective Cleanup
```bash
# Only clean dependencies and dead code
node scripts/cleanup-orchestrator.js --apply --skip "Manage Assets,Cleanup Configurations,Organize Scripts"
```

### Emergency Recovery
```bash
# If cleanup fails and you need to restore
node scripts/cleanup-orchestrator.js rollback

# Or use the backup system directly
node scripts/backup-rollback-system.js rollback initial
```

## Best Practices

1. **Always run dry run first** to preview changes
2. **Commit your work** before running cleanup
3. **Use backup system** unless you're absolutely sure
4. **Review the report** after cleanup completion
5. **Test your application** after cleanup to ensure functionality
6. **Keep backup files** until you're confident cleanup was successful

## Troubleshooting

### Cleanup Fails
- Check the log file for detailed error information
- Use rollback to restore previous state
- Run individual cleanup tools to isolate issues

### Backup System Issues
- Ensure git repository is clean before starting
- Check disk space for filesystem backups
- Verify git configuration is correct

### Validation Failures
- Review TypeScript compilation errors
- Check if required dependencies were accidentally removed
- Verify configuration files are still valid

## Integration

The orchestrator can be integrated into CI/CD pipelines or used as part of maintenance scripts. It's designed to be safe and reliable for automated use.