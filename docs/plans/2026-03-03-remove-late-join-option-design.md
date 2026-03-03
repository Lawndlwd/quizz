# Design: Remove "Allow Late Join" Option

## Overview
Remove the configurable "Allow late join" option and make late joining always enabled (true).

## Current State
- Option exists in admin settings UI (Settings.tsx)
- Server-side check prevents late joining when disabled
- Present in configuration files and type definitions
- Default value is `true` in config

## Proposed Changes

### 1. Client-side Changes
**File: `/client/src/pages/admin/Settings.tsx`**
- Remove lines 298-309 (checkbox UI for "Allow late join")
- Remove related state management

**File: `/client/src/types.ts`**
- Remove `allowLateJoin: boolean` from AppConfig interface

### 2. Server-side Changes
**File: `/server/src/socket/index.ts`**
- Remove the late join prevention check (line 353):
  ```typescript
  if (session.status === 'active' && !config.allowLateJoin) {
    socket.emit('player:error', { message: 'Game already in progress' });
    return;
  }
  ```

**File: `/server/src/types.ts`**
- Remove `allowLateJoin: boolean` from AppConfig interface

**File: `/server/src/routes/admin.ts`**
- Remove `'allowLateJoin'` from the configuration whitelist (line 50)

### 3. Configuration Changes
**File: `/config.json`**
- Remove `"allowLateJoin": true` line

**File: `/server/src/config.ts`**
- Remove `allowLateJoin: true` from DEFAULTS object

## Impact Analysis

### Positive Impacts
- Simpler codebase (removes ~15 lines of code)
- Less configuration complexity for admins
- Consistent behavior (always allow late joining)
- Removes potential confusion about mid-game joining

### Potential Risks
- None identified - this change aligns with the default behavior
- Existing games will continue to work as before (since default was true)

## Testing Strategy
- Verify players can join mid-game after changes
- Ensure admin settings UI loads without errors
- Confirm configuration saving works without the removed field
- Test that existing sessions continue to work

## Rollback Plan
If issues arise, the change can be reverted by:
1. Re-adding the removed code sections
2. Restoring configuration entries
3. Re-deploying the previous version

## Approval
User has approved this design on 2026-03-03.