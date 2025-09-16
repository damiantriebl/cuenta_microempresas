# Asset Management System

This system provides comprehensive asset management tools for the project, including asset reference scanning and unused asset detection.

## Overview

The asset management system consists of three main components:

1. **Asset Reference Scanner** - Scans all TypeScript/JavaScript files for asset references
2. **Unused Asset Detector** - Compares all assets with referenced assets to find unused ones
3. **Asset Manager** - Combined tool that orchestrates both functionalities

## Scripts

### Individual Tools

- `scripts/asset-reference-scanner.js` - Scans for asset references only
- `scripts/unused-asset-detector.js` - Detects unused assets only
- `scripts/asset-manager.js` - Combined asset management tool

### Package.json Scripts

```bash
# Asset management
pnpm run assets:scan        # Scan for asset references only
pnpm run assets:unused      # Detect unused assets only
pnpm run assets:analyze     # Complete asset analysis (recommended)
pnpm run assets:clean       # Preview unused asset cleanup (dry-run)
pnpm run assets:remove      # Actually remove unused assets

# Integrated with cleanup system
pnpm run cleanup:scan-assets  # Asset analysis as part of cleanup
pnpm run cleanup:scan-all     # All cleanup scans including assets
```

## Usage Examples

### Basic Analysis
```bash
# Run complete asset analysis
pnpm run assets:analyze

# Or use the script directly
node scripts/asset-manager.js analyze
```

### Cleaning Unused Assets
```bash
# Preview what would be removed (safe)
pnpm run assets:clean

# Actually remove unused assets (destructive)
pnpm run assets:remove
```

### Individual Components
```bash
# Just scan for references
pnpm run assets:scan

# Just detect unused assets
pnpm run assets:unused
```

## Asset Reference Patterns

The scanner detects the following asset reference patterns:

1. **require() statements**
   ```javascript
   require('@/assets/images/logo.png')
   require('../assets/fonts/font.ttf')
   ```

2. **import statements**
   ```javascript
   import logo from '@/assets/images/logo.png'
   import '../assets/styles/style.css'
   ```

3. **Dynamic imports**
   ```javascript
   import('@/assets/images/logo.png')
   ```

4. **String references in config files**
   ```json
   {
     "icon": "./assets/images/logo.png",
     "favicon": "assets/images/favicon.png"
   }
   ```

## Scanned Locations

### Directories
- `app/` - Application code
- `components/` - React components
- `hooks/` - Custom hooks
- `context/` - React contexts
- `services/` - Service layer
- `schemas/` - Data schemas
- `scripts/` - Build and utility scripts
- `docs/` - Documentation files

### File Types
- `.ts`, `.tsx` - TypeScript files
- `.js`, `.jsx` - JavaScript files
- `.json` - Configuration files
- `.md` - Documentation files

### Additional Files
- `app.json` - Expo configuration
- `app.config.js` - Expo configuration
- `metro.config.js` - Metro bundler configuration

## Asset Types Detected

The system detects the following asset file extensions:
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.ico`
- **Fonts**: `.ttf`, `.otf`, `.woff`, `.woff2`
- **Media**: `.mp3`, `.mp4`, `.webm`

## Reports Generated

### Asset Reference Report (`asset-references-report.json`)
- List of all scanned files
- List of all referenced assets
- Scan statistics and errors

### Unused Asset Report (`unused-assets-report.json`)
- List of all assets found
- List of referenced assets
- List of unused assets with file sizes
- Recommendations for cleanup

### Combined Report (`asset-management-report.json`)
- Complete analysis combining both reports
- Summary statistics
- Actionable recommendations

## Safety Features

1. **Dry-run mode** - Preview changes before applying them
2. **Comprehensive scanning** - Checks multiple file types and locations
3. **Error handling** - Graceful handling of file access errors
4. **Detailed reporting** - Clear information about what will be changed
5. **Path normalization** - Handles different asset reference formats

## Best Practices

1. **Always run analysis first** to understand current asset usage
2. **Review unused assets** before deletion - some may be used dynamically
3. **Check native configurations** - assets might be referenced in native code
4. **Use dry-run mode** to preview changes before applying them
5. **Keep backups** - consider creating a git branch before cleanup

## Integration with Cleanup System

The asset management system is integrated with the broader project cleanup system:

- Included in `cleanup:scan-all` for comprehensive project analysis
- Reports are compatible with the main cleanup analyzer
- Follows the same patterns as other cleanup tools

## Troubleshooting

### Common Issues

1. **Assets not detected as referenced**
   - Check if the asset path format is supported
   - Verify the file is in a scanned directory
   - Check for dynamic asset loading patterns

2. **False positives for unused assets**
   - Assets might be used in native code or configurations
   - Check for string concatenation in asset paths
   - Review dynamic import patterns

3. **Performance issues**
   - Large projects may take longer to scan
   - Consider excluding unnecessary directories
   - Use specific commands instead of full analysis

### Getting Help

If you encounter issues:
1. Check the error messages in the console output
2. Review the generated report files for details
3. Use individual tools to isolate the problem
4. Check file permissions and access rights