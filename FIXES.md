# Bug Fixes - Multiple Voting & Viewer Count

## Issues Fixed

### 1. ✅ Multiple Voting from Different Browsers
**Problem**: Users could vote multiple times using different browsers on the same device/network.

**Solution**: 
- **Strict IP-based limit**: Changed from 3 votes per IP per poll to **1 vote per IP per poll**
- This prevents any device/network from voting more than once, regardless of browser
- Combined with fingerprint checking for additional security

**Implementation**:
- Updated `server/routes/votes.js` to enforce strict 1 vote per IP per poll
- Error message: "This IP address/network has already voted on this poll. Each IP can only vote once per poll."

### 2. ✅ Viewer Count Increasing on Page Refresh
**Problem**: Viewer count kept increasing when users refreshed the page because:
- Socket disconnect wasn't properly decrementing viewer count
- Same socket could join the same poll multiple times
- Manual increment/decrement was unreliable

**Solution**:
- **Use actual Socket.io room size** instead of manual tracking
- Track which polls each socket is in to prevent duplicate joins
- Properly handle disconnect events to update viewer counts

**Implementation**:
- Updated `server/index.js` to:
  - Track sockets and their polls in `socketPolls` Map
  - Use `io.sockets.adapter.rooms.get()` to get actual room size
  - Prevent duplicate joins from same socket
  - Properly decrement on disconnect
- Updated `client/src/pages/ViewPoll.jsx` to:
  - Prevent duplicate join emissions
  - Handle socket connection state properly

## Technical Details

### Viewer Count Fix
```javascript
// Before: Manual increment/decrement (unreliable)
pollViewers.set(pollId, currentCount + 1);

// After: Use actual room size (reliable)
const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
const viewerCount = room ? room.size : 0;
```

### Anti-Abuse Protection Order
1. Cookie check (fastest)
2. Fingerprint check (browser-specific)
3. **IP check (STRICT - 1 per poll)** ← Prevents different browsers
4. Global IP rate limit (10 per hour)

## Testing

### Test Multiple Browsers
1. Vote from Browser A → ✅ Success
2. Vote from Browser B (same device) → ❌ Blocked: "IP address/network has already voted"
3. Vote from Browser C (different device, different IP) → ✅ Success

### Test Viewer Count
1. Open poll in Tab 1 → Viewer count: 1
2. Open poll in Tab 2 → Viewer count: 2
3. Refresh Tab 1 → Viewer count: Still 2 (not 3)
4. Close Tab 2 → Viewer count: 1

## Impact

- ✅ **Prevents vote manipulation** from same device/network
- ✅ **Accurate viewer counts** that don't inflate on refresh
- ✅ **Better user experience** with reliable real-time updates
- ⚠️ **Trade-off**: Users on same network (office/school) share IP limit
  - This is intentional to prevent abuse
  - Legitimate users can use mobile data or different networks

## Files Modified

1. `server/index.js` - Fixed viewer count tracking
2. `server/routes/votes.js` - Strict IP limit (1 per poll)
3. `client/src/pages/ViewPoll.jsx` - Prevent duplicate socket joins

---

**Status**: ✅ Both issues resolved and tested
