# Requirements Document

## Introduction

This feature focuses on auditing and simplifying an Expo + React Native + Firebase project by eliminating unused code, assets, scripts, and dependencies while normalizing configuration files. The goal is to maintain a minimal viable product (MVP) that supports Android and Web platforms with Firestore and Firebase Auth functionality.

## Requirements

### Requirement 1: Dead Code Elimination

**User Story:** As a developer, I want to remove all unused code, imports, and exports from the project, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN TypeScript compilation runs with strict settings THEN the system SHALL pass with `noUnusedLocals` and `noUnusedParameters` enabled
2. WHEN running `depcheck`, `knip`, `ts-prune`, and `unimported` tools THEN the system SHALL report zero unused dependencies and dead code
3. WHEN checking imports and exports THEN the system SHALL have no orphaned or unreferenced code modules
4. IF dynamic imports exist (`require()` or `import()`) THEN the system SHALL preserve those referenced files

### Requirement 2: Dependency Optimization

**User Story:** As a developer, I want to remove unused dependencies and ensure all required dependencies are properly declared, so that the project has minimal footprint and clear dependency management.

#### Acceptance Criteria

1. WHEN running `depcheck --skip-missing` THEN the system SHALL report zero unused dependencies
2. WHEN checking package.json THEN the system SHALL contain only dependencies that are actually imported or used
3. WHEN installing dependencies THEN the system SHALL use pnpm as the package manager
4. IF a dependency is removed THEN the system SHALL still compile and run without errors

### Requirement 3: Asset Management

**User Story:** As a developer, I want to remove unused assets from the project, so that the bundle size is optimized and only necessary files are included.

#### Acceptance Criteria

1. WHEN scanning the `assets/` directory THEN the system SHALL contain only files that are referenced in the codebase
2. WHEN checking asset references THEN the system SHALL find all assets used in `app/`, `components/`, and related directories
3. IF an asset is not referenced anywhere THEN the system SHALL remove it from the project
4. WHEN building the project THEN the system SHALL not include unused assets in the bundle

### Requirement 4: Configuration Normalization

**User Story:** As a developer, I want to have minimal and valid Expo configuration files, so that the project setup is clean and maintainable.

#### Acceptance Criteria

1. WHEN reviewing `app.config.js` or `app.json` THEN the system SHALL contain only necessary configuration keys
2. WHEN checking `eas.json` THEN the system SHALL contain only actively used build profiles
3. WHEN validating Firebase config THEN the system SHALL have coherent `firebase.json`, `firestore.rules`, and `firestore.indexes.json` files
4. IF a configuration key is not used THEN the system SHALL remove it from the config files

### Requirement 5: Script and Tool Organization

**User Story:** As a developer, I want to organize development scripts and remove debug utilities, so that the project structure is clean and professional.

#### Acceptance Criteria

1. WHEN checking the `scripts/` directory THEN the system SHALL contain only actively used utilities
2. IF debug scripts (`debug-*.ts`) exist and are not used THEN the system SHALL move them to `tools/` or remove them
3. WHEN reviewing package.json scripts THEN the system SHALL contain only functional and necessary commands
4. IF development tools are kept THEN the system SHALL organize them in appropriate directories

### Requirement 6: TypeScript Strict Mode Compliance

**User Story:** As a developer, I want the project to use strict TypeScript settings, so that code quality is maintained and potential issues are caught early.

#### Acceptance Criteria

1. WHEN TypeScript compiles THEN the system SHALL use strict mode with `noUnusedLocals` and `noUnusedParameters` enabled
2. WHEN checking TypeScript configuration THEN the system SHALL have `exactOptionalPropertyTypes` and `noFallthroughCasesInSwitch` enabled
3. WHEN running `tsc --noEmit` THEN the system SHALL pass without errors
4. IF there are TypeScript errors THEN the system SHALL fix them before proceeding

### Requirement 7: Platform Support Validation

**User Story:** As a developer, I want to ensure the cleaned project works on Android and Web platforms, so that the MVP functionality is preserved.

#### Acceptance Criteria

1. WHEN starting the development server THEN the system SHALL run successfully on Web platform
2. WHEN running on Android emulator THEN the system SHALL launch without errors
3. WHEN testing basic navigation THEN the system SHALL navigate between screens without 404 errors
4. WHEN testing Firebase integration THEN the system SHALL perform basic Firestore read/write operations

### Requirement 8: Documentation Update

**User Story:** As a developer, I want updated documentation that explains the simplified setup, so that other developers can quickly understand and work with the project.

#### Acceptance Criteria

1. WHEN reading the README.md THEN the system SHALL explain quick setup using pnpm
2. WHEN checking documentation THEN the system SHALL include information about required environment variables
3. WHEN reviewing available commands THEN the system SHALL document lint, test, build, and launch commands
4. WHEN checking platform support THEN the system SHALL clearly state Android/Web support iOS IS NOT REQUIRED

TODOS LOS TEXTOS, ABSOLUTAMENTE TODOS, TIENEN QUE SER EN ESPAÑOL