# Raindrop Integration Implementation for Highlighter Bear

## Overview

This document describes the Raindrop.io integration implementation for Highlighter Bear, following the patterns from the Sticky Bear project's `RAINDROP_INTEGRATION.md` guide.

## Features Implemented

### 1. OAuth Login (Options Page)

- ✅ Users can login to Raindrop.io via OAuth 2.0
- ✅ OAuth tokens are securely stored and automatically refreshed
- ✅ Login/logout UI with status indicators
- ✅ External OAuth service integration (ohauth.vercel.app)

### 2. Manual Backup

- ✅ Backup all highlighting rules to Raindrop
- ✅ Rules are stored in a "Highlight Bear" collection
- ✅ All rules saved as a single JSON document
- ✅ Visual feedback during backup operations

### 3. Auto Backup

- ✅ Automatically backup when rules are added
- ✅ Automatically backup when rules are deleted
- ✅ Automatically backup when rules are updated
- ✅ 5-second debouncing to prevent excessive API calls
- ✅ Badge indicators showing backup status

### 4. Auto Restore

- ✅ Auto restore on extension install/update
- ✅ Auto restore on browser startup
- ✅ Auto restore every 5 minutes
- ✅ Auto restore after OAuth login
- ✅ Silent mode to prevent duplicate notifications

## File Structure

```
highlighter-bear/
├── manifest.json                          # Updated with permissions
├── src/
│   ├── background.js                      # Updated with Raindrop integration
│   ├── modules/
│   │   ├── oauth.js                       # NEW: OAuth token handling
│   │   ├── raindropBackup.js             # NEW: Backup/restore logic
│   │   └── autoBackup.js                 # NEW: Auto backup scheduling
│   └── options/
│       ├── options.html                   # Updated with Raindrop UI
│       └── options.js                     # Updated with Raindrop controls
```

## Implementation Details

### 1. Manifest.json Changes

Added the following permissions and configurations:

```json
"permissions": [
  "storage",
  "tabs",
  "notifications"  // NEW
],
"host_permissions": [
  "https://api.raindrop.io/*",
  "https://ohauth.vercel.app/*"
],
"externally_connectable": {
  "matches": ["https://ohauth.vercel.app/*"]
}
```

### 2. OAuth Module (`src/modules/oauth.js`)

**Purpose**: Handle OAuth token reception from external OAuth service

**Key Functions**:

- `initOAuthListener()`: Listens for OAuth tokens from ohauth.vercel.app
- Validates sender URL and message format
- Stores tokens in chrome.storage.sync
- Shows success notification

### 3. Raindrop Backup Module (`src/modules/raindropBackup.js`)

**Purpose**: Core backup and restore functionality

**Key Functions**:

#### Token Management

- `getActiveToken()`: Get active token, refreshing if necessary
- `refreshOAuthToken()`: Refresh expired tokens
- `isOAuthTokenExpiringSoon()`: Check token expiry (10-minute buffer)

#### API Helpers

- `apiGET()`, `apiPOST()`, `apiPUT()`, `apiDELETE()`: API wrappers
- `fetchWithRetry()`: Exponential backoff for rate limiting
- `sleep()`: Delay helper for throttling

#### Collection Management

- `getOrCreateCollection()`: Find or create "Highlight Bear" collection
- `findCollectionId()`: Find collection by name
- `fetchAllItemsFromCollection()`: Paginated item fetching

#### Core Operations

- `backupRulesToRaindrop()`: Backup all rules to Raindrop
- `restoreRulesFromRaindrop()`: Restore rules from Raindrop
- `prepareRaindropData()`: Convert rules to Raindrop format

#### Data Format

Rules are stored as a single Raindrop item with:

- **Link**: `highlighter-bear://rules/all` (custom protocol for identification)
- **Title**: "Highlighter Bear Rules (X rules)"
- **Note**: Full JSON of all rules
- **Excerpt**: Metadata (version, count, last sync timestamp)
- **Tags**: `['highlighter-bear', 'rules']`

### 4. Auto Backup Module (`src/modules/autoBackup.js`)

**Purpose**: Automatic backup with debouncing

**Key Functions**:

- `scheduleAutoBackup()`: Schedule backup with 5-second debounce
- `executeBackup()`: Execute the backup operation
- `cancelScheduledBackup()`: Cancel pending backup
- Badge indicator functions for visual feedback

**Debouncing Strategy**:

- 5-second delay before executing backup
- Each change resets the timer
- Prevents multiple rapid backups

### 5. Background Script (`src/background.js`)

**Purpose**: Coordinate all Raindrop operations

**Key Additions**:

#### Initialization

```javascript
import { initOAuthListener } from './modules/oauth.js';
import {
  backupRulesToRaindrop,
  restoreRulesFromRaindrop,
} from './modules/raindropBackup.js';
import { scheduleAutoBackup } from './modules/autoBackup.js';

// Initialize OAuth listener
initOAuthListener();

// Auto restore on startup
executeAutoRestore('startup');

// Setup periodic auto restore (every 5 minutes)
setInterval(() => {
  executeAutoRestore('periodic');
}, 5 * 60 * 1000);
```

#### Message Handlers

- `backup_to_raindrop`: Manual backup trigger
- `restore_from_raindrop`: Manual restore trigger
- `schedule_auto_backup`: Schedule auto backup

#### Storage Change Listener

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  // Auto backup on rules change
  if (areaName === 'sync' && changes.highlighterRules) {
    scheduleAutoBackup('rules_changed');
  }

  // Auto restore on OAuth login
  if (areaName === 'sync' && changes.oauthAccessToken) {
    const { oldValue, newValue } = changes.oauthAccessToken;
    if (!oldValue && newValue) {
      executeAutoRestore('oauth_login', { notifyOnSuccess: true });
    }
  }
});
```

### 6. Options UI (`src/options/options.html`)

**New Section**: Raindrop.io Sync card with:

1. **Connection Status**

   - Status badge (Connected/Disconnected)
   - Login/Logout buttons

2. **Manual Sync Controls**

   - Backup Now button
   - Restore Now button

3. **Auto Backup Toggle**

   - Enable/disable auto backup
   - Disabled when not logged in

4. **Information Alert**
   - Explains sync features
   - Lists auto restore and backup triggers

### 7. Options JavaScript (`src/options/options.js`)

**New Methods**:

#### UI Management

- `setupRaindropListeners()`: Setup event listeners for Raindrop controls
- `updateRaindropUI()`: Update UI based on OAuth status
  - Shows/hides login/logout buttons
  - Enables/disables backup/restore buttons
  - Updates status badge and text
  - Syncs auto backup toggle state

#### Event Handlers

- `handleRaindropLogin()`: Open OAuth page in new tab
- `handleRaindropLogout()`: Clear OAuth tokens with confirmation
- `handleBackupToRaindrop()`: Trigger manual backup
- `handleRestoreFromRaindrop()`: Trigger manual restore with confirmation
- `handleAutoBackupToggle()`: Toggle auto backup on/off

## User Flow

### Initial Setup

1. User opens options page
2. Sees "Disconnected" status in Raindrop section
3. Clicks "Login to Raindrop" button
4. Redirected to OAuth page
5. Authorizes application
6. Token received and stored
7. UI updates to show "Connected" status
8. Backup/restore buttons become enabled

### Manual Backup

1. User clicks "Backup Now" button
2. Button shows loading state
3. Background script executes backup
4. Success/failure message shown
5. Button returns to normal state

### Manual Restore

1. User clicks "Restore Now" button
2. Confirmation dialog appears
3. Button shows loading state
4. Background script executes restore
5. Rules list updates automatically
6. Success/failure message shown

### Auto Backup

1. User enables "Auto Backup" toggle
2. User adds/edits/deletes a rule
3. Auto backup scheduled with 5-second delay
4. Badge shows "⟳" during backup
5. Badge shows "✓" on success or "✗" on failure
6. Badge clears after 3-5 seconds

### Auto Restore

Auto restore happens automatically:

- On extension install/update
- On browser startup
- Every 5 minutes
- After OAuth login

## Testing Guide

### Test 1: OAuth Login Flow

1. Open options page
2. Verify "Disconnected" status
3. Click "Login to Raindrop"
4. Complete OAuth flow
5. Verify "Connected" status
6. Verify buttons are enabled

### Test 2: Manual Backup

1. Create some highlighting rules
2. Click "Backup Now"
3. Wait for success message
4. Check Raindrop.io for "Highlight Bear" collection
5. Verify rules are stored correctly

### Test 3: Manual Restore

1. Make changes to rules in Raindrop
2. Click "Restore Now"
3. Confirm the action
4. Verify rules are updated locally

### Test 4: Auto Backup on Rule Changes

1. Enable "Auto Backup" toggle
2. Add a new rule
3. Wait 5 seconds
4. Verify badge shows backup progress
5. Verify rule is backed up to Raindrop

### Test 5: Auto Restore on Startup

1. Make changes in Raindrop
2. Restart browser
3. Open options page
4. Verify rules match Raindrop version

### Test 6: Periodic Auto Restore

1. Make changes in Raindrop
2. Wait 5 minutes
3. Verify local rules update automatically

## Error Handling

### Rate Limiting

- Exponential backoff for 429 responses
- 100ms delays between batch operations
- Maximum 5 retries

### Token Expiry

- Automatic refresh when within 10 minutes of expiry
- Fallback to existing token if refresh fails

### Network Errors

- Graceful failure messages
- User-friendly error notifications

### Data Validation

- JSON parsing error handling
- Missing field handling with defaults
- Array structure validation

## Security Considerations

1. **No Client Secrets**: OAuth handled by external service
2. **HTTPS Only**: All API calls over HTTPS
3. **Sender Validation**: External messages validated
4. **Token Storage**: Tokens stored in chrome.storage.sync
5. **Restricted Domains**: externally_connectable limited to ohauth.vercel.app

## Performance Optimizations

1. **Debouncing**: 5-second delay prevents excessive backups
2. **Throttling**: 100ms delays between API calls
3. **Pagination**: Large collections fetched in chunks
4. **Concurrent Prevention**: Locks prevent simultaneous operations

## Known Limitations

1. **Single Item Storage**: All rules stored in one Raindrop item

   - Pros: Simple, atomic updates
   - Cons: Entire ruleset replaced on each sync

2. **5-Minute Restore Interval**: May not catch immediate changes

   - Consider: User can manually restore for immediate sync

3. **No Conflict Resolution**: Last sync wins
   - Restore always replaces local data
   - Backup always replaces remote data

## Future Enhancements

1. **Conflict Detection**: Detect when local and remote differ
2. **Merge Strategy**: Smart merging instead of replacement
3. **Sync History**: Track sync operations
4. **Selective Restore**: Restore individual rules
5. **Sync Status Indicator**: Real-time sync status in popup

## Conclusion

The Raindrop integration is fully implemented and ready for testing. All four required features are functional:

1. ✅ OAuth login in options page
2. ✅ Manual backup to "Highlight Bear" collection
3. ✅ Auto backup on rule changes
4. ✅ Auto restore on startup and every 5 minutes

The implementation follows the patterns from Sticky Bear's RAINDROP_INTEGRATION.md guide and uses vanilla JavaScript as per the project's AGENTS.md requirements.
