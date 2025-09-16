# Database Migration Scripts

This directory contains scripts for executing and managing database migrations for the company and product data restructuring.

## Overview

The migration process restructures the database to:
1. Add required `nombre` field to company documents
2. Ensure products have required `ultimoCosto` and `ultimaGanancia` fields
3. Maintain data integrity throughout the process

## Scripts

### 1. Migration Execution Script (`execute-migration.ts`)

Executes the full database migration process with progress tracking and validation.

#### Usage

```bash
# Execute migration for all companies
npm run migrate:execute

# Dry run to see what would be migrated
npm run migrate:dry-run

# Migrate specific company only
npm run migrate:execute -- --company-id "company123"

# Set custom default values for missing product fields
npm run migrate:execute -- --default-cost 10 --default-profit 5

# Skip backup creation (NOT RECOMMENDED)
npm run migrate:execute -- --skip-backup
```

#### Options

- `--company-id <id>`: Migrate specific company only
- `--dry-run`: Show what would be migrated without executing
- `--skip-backup`: Skip backup creation (NOT RECOMMENDED)
- `--default-cost <n>`: Default cost value for products (default: 0)
- `--default-profit <n>`: Default profit value for products (default: 0)
- `--help`: Show help information

#### Process Flow

1. **Pre-migration Analysis**: Analyzes current database state and generates migration plan
2. **Company Migration**: For each company:
   - Creates backup (unless skipped)
   - Migrates company name if needed
   - Migrates product data if needed
   - Validates migration success
3. **Post-migration Validation**: Validates all migrations after completion
4. **Final Report**: Generates comprehensive migration report

### 2. Rollback Script (`rollback-migration.ts`)

Provides functionality to rollback migrations using previously created backups.

#### Usage

```bash
# List available backups
npm run migrate:rollback -- --list

# List backups for specific company
npm run migrate:rollback -- --company-id "company123" --list

# Rollback using specific backup ID
npm run migrate:rollback -- --backup-id "backup456"

# Use latest backup for company
npm run migrate:rollback -- --company-id "company123" --latest

# Show rollback plan without executing
npm run migrate:rollback -- --backup-id "backup456" --dry-run
```

#### Options

- `--backup-id <id>`: Specific backup ID to rollback from
- `--company-id <id>`: Show backups for specific company only
- `--list`: List available backups
- `--latest`: Use latest backup for company
- `--dry-run`: Show rollback plan without executing
- `--help`: Show help information

## Migration Process Details

### Backup Creation

Before any migration, the system creates a complete backup of:
- Company document data
- All product documents (including inactive ones)
- Metadata about the backup

Backups are stored in the `migration_backups` collection and include validation checksums.

### Company Name Migration

For companies missing the `nombre` field:
1. Generates default name based on owner email
2. Validates name format and length
3. Updates company document with new name
4. Validates migration success

### Product Data Migration

For products missing required fields:
1. Identifies products with missing `ultimoCosto` or `ultimaGanancia`
2. Sets default values (configurable via CLI options)
3. Updates product documents in batch
4. Validates all products have required fields

### Validation

Multiple validation layers ensure data integrity:
- Pre-migration: Analyzes what needs to be migrated
- During migration: Validates each step
- Post-migration: Comprehensive validation of all changes
- Rollback validation: Ensures rollback was successful

## Error Handling

The migration system includes comprehensive error handling:

### Automatic Recovery
- Batch operations for atomicity
- Automatic retry for transient failures
- Graceful handling of permission issues

### Manual Recovery
- Complete rollback functionality
- Detailed error logging
- Step-by-step recovery instructions

### Monitoring
- Real-time progress tracking
- Detailed logging of all operations
- Performance metrics and timing

## Safety Features

### Backup System
- Automatic backup creation before migration
- Backup validation and integrity checks
- Multiple backup retention
- Easy rollback functionality

### Validation System
- Pre-migration analysis and planning
- Step-by-step validation during migration
- Post-migration comprehensive validation
- Rollback validation

### Dry Run Mode
- See exactly what would be migrated
- No changes made to database
- Full analysis and planning
- Risk assessment

## Best Practices

### Before Migration
1. **Always run dry-run first**: `npm run migrate:dry-run`
2. **Review migration plan carefully**
3. **Ensure adequate backup storage space**
4. **Test on development environment first**
5. **Plan for maintenance window if needed**

### During Migration
1. **Monitor progress logs**
2. **Don't interrupt the process**
3. **Keep backup of migration logs**
4. **Have rollback plan ready**

### After Migration
1. **Validate all functionality**
2. **Test critical user workflows**
3. **Monitor for any issues**
4. **Keep backups until confident**
5. **Update documentation**

## Troubleshooting

### Common Issues

#### Permission Errors
```bash
Error: Missing or insufficient permissions
```
**Solution**: Ensure user has proper Firestore permissions for read/write operations.

#### Backup Validation Failed
```bash
Error: Backup validation failed
```
**Solution**: Check backup integrity, may need to recreate backup or use different backup.

#### Product Migration Failed
```bash
Error: Product migration validation failed
```
**Solution**: Check product data structure, may need manual intervention for specific products.

### Recovery Procedures

#### If Migration Fails Mid-Process
1. Check error logs for specific failure point
2. Use rollback functionality: `npm run migrate:rollback -- --latest --company-id <id>`
3. Fix underlying issue
4. Re-run migration for affected companies

#### If Rollback Fails
1. Check rollback error logs
2. Try different backup: `npm run migrate:rollback -- --list`
3. Manual data recovery may be required
4. Contact system administrator

### Getting Help

#### Log Analysis
- Check console output for detailed error messages
- Migration status is stored in `migration_status` collection
- Backup data is in `migration_backups` collection

#### Support Information
When reporting issues, include:
- Full error message and stack trace
- Migration options used
- Company ID(s) affected
- Backup ID(s) if applicable
- Console output logs

## Development

### Adding New Migration Steps

1. Update `MigrationService` with new migration logic
2. Add validation methods for new migration
3. Update migration execution script
4. Add tests for new functionality
5. Update documentation

### Testing

```bash
# Run migration tests
npm test -- --testPathPattern=migration

# Test specific migration functionality
npm test -- services/MigrationService.test.ts
```

### Dependencies

The migration scripts require:
- `tsx`: TypeScript execution
- `commander`: CLI argument parsing
- `firebase/firestore`: Database operations
- All existing project dependencies

Install with:
```bash
npm install --save-dev tsx commander
```

## Security Considerations

### Data Protection
- Backups contain sensitive business data
- Ensure proper access controls
- Consider encryption for backup storage
- Regular cleanup of old backups

### Access Control
- Migration requires admin-level permissions
- Validate user permissions before execution
- Log all migration activities
- Audit trail for compliance

### Production Safety
- Always test in development first
- Use maintenance windows for production
- Have rollback plan ready
- Monitor system health during migration
## Java Environment Setup Scripts

This directory contains scripts for setting up and validating the Java development environment required for Android development with Expo.

### Quick Start

```bash
# Windows - Automated setup
.\scripts\setup-java.bat

# Or PowerShell directly
.\scripts\detect-java.ps1 -SetEnvironment

# Validate your setup
.\scripts\validate-environment.ps1
```

### Java Environment Scripts

#### 1. Java Detection Script (`detect-java.ps1`)

PowerShell script that automatically detects Java installations and configures JAVA_HOME.

**Usage:**
```powershell
# Detect Java installations (read-only)
.\scripts\detect-java.ps1

# Auto-configure JAVA_HOME environment variable
.\scripts\detect-java.ps1 -SetEnvironment

# Show detailed information about all found installations
.\scripts\detect-java.ps1 -Verbose
```

**Features:**
- Scans common Windows Java installation paths
- Validates Java version compatibility (Java 11+ required)
- Automatically selects the best Java installation
- Sets JAVA_HOME environment variable
- Supports all major Java distributions

**Supported Java Distributions:**
- Oracle JDK
- OpenJDK
- Eclipse Adoptium (Temurin) - Recommended
- Amazon Corretto
- Microsoft OpenJDK

#### 2. Java Setup Batch File (`setup-java.bat`)

User-friendly batch file that provides guided Java environment setup.

**Usage:**
```cmd
# Run the interactive setup
.\scripts\setup-java.bat
```

**Features:**
- Interactive setup process
- Calls PowerShell detection script
- Provides manual setup instructions as fallback
- Works in restricted PowerShell environments
- Guides users through the entire process

#### 3. Environment Validation Script (`validate-environment.ps1`)

Comprehensive validation of all development environment prerequisites.

**Usage:**
```powershell
# Basic validation
.\scripts\validate-environment.ps1

# Detailed validation with version information
.\scripts\validate-environment.ps1 -Verbose

# Validate and attempt automatic fixes
.\scripts\validate-environment.ps1 -Fix
```

**Validation Checks:**
- ✅ JAVA_HOME environment variable
- ✅ Java installation and version (11+ required)
- ✅ Node.js installation
- ✅ Package manager (npm/yarn)
- ✅ Expo CLI availability
- ⚠️ Android SDK configuration (optional)

### Troubleshooting

For comprehensive troubleshooting information, see [`docs/JAVA_SETUP_TROUBLESHOOTING.md`](../docs/JAVA_SETUP_TROUBLESHOOTING.md).

#### Common Issues and Quick Fixes

**JAVA_HOME Not Set:**
```powershell
.\scripts\detect-java.ps1 -SetEnvironment
```

**Java Version Incompatible:**
- Install Java 11+ from [Eclipse Adoptium](https://adoptium.net/)
- Run setup script again

**Multiple Java Installations:**
```powershell
# See all installations
.\scripts\detect-java.ps1 -Verbose

# Auto-select best version
.\scripts\detect-java.ps1 -SetEnvironment
```

**Permission Issues:**
- Run PowerShell as Administrator
- Or use manual setup instructions in troubleshooting guide

### Requirements

**Minimum Requirements:**
- Java 11 or higher (Java 17 LTS recommended)
- JAVA_HOME environment variable properly set
- Java bin directory in system PATH

**Recommended Setup:**
- Eclipse Adoptium JDK 17 (LTS)
- Clean installation (remove old Java versions)
- System-wide environment variables

### Integration with Expo Development

These scripts ensure proper Java configuration for:

**Development Commands:**
```bash
# These should work after setup
npx expo run:android
npx expo build:android
```

**Build Systems:**
- Expo CLI Android builds
- Gradle builds
- Android Studio integration
- EAS builds

**Validation Workflow:**
1. Run environment validation: `.\scripts\validate-environment.ps1`
2. Fix any reported issues using the scripts
3. Test Android build: `npx expo run:android`
4. If issues persist, consult troubleshooting guide

### Script Dependencies

**PowerShell Requirements:**
- PowerShell 5.1+ (included with Windows 10/11)
- Execution policy allowing script execution
- User permissions to set environment variables

**No Additional Dependencies:**
- Scripts use only built-in Windows commands
- No external PowerShell modules required
- Compatible with corporate/restricted environments