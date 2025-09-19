# Development Scripts

⚠️ **WARNING: These scripts are for development purposes only!**

These scripts contain sensitive operations and should NEVER be used in production.

## Scripts Moved Here:

### Database Seeding & Testing
- `seedBreatheMoveClasses.ts` - Seeds test data for Breathe & Move classes
- `resetBreatheMoveClasses.ts` - Resets Breathe & Move data
- `cleanSundayClasses.ts` - Cleans duplicate Sunday classes
- `cleanDuplicateClasses.ts` - Removes duplicate class entries
- `forceSeedClasses.ts` - Forces seed data insertion
- `debugBreatheMoveClasses.ts` - Debug utilities for classes
- `seedTestData.ts` - General test data seeding
- `initializeBreatheMoveClasses.ts` - Initial class setup

### User Management (Testing)
- `createTestUser.js` - Creates test users
- `createUserDirectly.js` - Direct user creation bypass
- `createUserWorkaround.js` - Workaround for user creation issues
- `simpleCreateUser.js` - Simplified user creation
- `fixDatabaseAndCreateUser.js` - Database fixes with user creation
- `update-password.js` - Updates user passwords

### Database Utilities
- `fix-database.sql` - Database structure fixes
- `setupTestUser.sql` - Test user SQL setup
- `create_test_users.sql` - SQL for creating test users

### Testing
- `test-login.js` - Tests login functionality
- `testPayment.ts` - Payment system tests
- `mockPayment.ts` - Mock payment operations
- `checkBreatheMoveCitas.ts` - Checks appointment data

## Usage

1. Copy `.env.example` to `.env` and fill in your development credentials
2. Run scripts with proper environment variables:
   ```bash
   node dev-scripts/test-login.js
   ```

## Security Notes

- NEVER commit `.env` files
- NEVER use these scripts with production credentials
- Always use environment variables for sensitive data
- These scripts bypass security measures and should only be used for development