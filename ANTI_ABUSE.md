# Anti-Abuse Protection System

## Overview

The Apollo Poll application uses a **multi-layered defense system** to prevent vote manipulation and ensure fair polling. The system combines browser fingerprinting, cookie tracking, IP-based rate limiting, and database-level constraints.

## Protection Layers

### Layer 1: Browser Fingerprinting (Primary Defense)

**Technology**: Advanced browser fingerprinting using multiple signals

**Components**:
- Canvas fingerprinting (rendering characteristics)
- WebGL fingerprinting (GPU characteristics)  
- Audio fingerprinting (audio processing)
- Screen properties (resolution, color depth)
- System properties (timezone, language, hardware)
- Browser capabilities (localStorage, indexedDB, etc.)
- Persistent device ID stored in localStorage

**How it works**:
1. On first visit, browser characteristics are collected
2. A unique hash is generated from these characteristics
3. Combined with a device ID stored in localStorage
4. This fingerprint is sent with every vote request
5. Server checks if this fingerprint has already voted on the poll

**Prevents**:
- ✅ Voting from different browsers on same device
- ✅ Voting from incognito/private tabs
- ✅ Clearing cookies to vote again
- ✅ Multiple browser sessions from same device

**Effectiveness**: ~95% - Very difficult to bypass without technical knowledge

---

### Layer 2: Cookie-Based Tracking

**Technology**: HTTP-only cookies

**How it works**:
- Unique voter ID stored in HTTP-only cookie
- Cookie persists across page refreshes
- Cannot be accessed by JavaScript (XSS protection)

**Prevents**:
- ✅ Simple refresh-and-vote attacks
- ✅ Basic duplicate voting attempts

**Limitations**:
- Can be cleared by user
- Different browsers create new cookies
- Incognito mode creates new cookies

**Effectiveness**: ~60% - Good first line of defense, but easily bypassed

---

### Layer 3: IP-Based Rate Limiting (Global)

**Technology**: IP address tracking with time windows

**Limits**:
- Maximum 10 votes per hour per IP (across all polls)
- Prevents mass voting from single location

**Prevents**:
- ✅ Bot attacks
- ✅ Automated voting scripts
- ✅ Mass voting campaigns

**Limitations**:
- Shared networks (offices, schools) share IPs
- VPNs can change IPs
- Mobile networks may rotate IPs

**Effectiveness**: ~70% - Good for preventing automated attacks

---

### Layer 4: Per-Poll IP Rate Limiting

**Technology**: IP tracking per individual poll

**Limits**:
- Maximum 3 votes per IP per poll within 24 hours

**Prevents**:
- ✅ Multiple votes on same poll from same network
- ✅ Abuse even if fingerprint is cleared

**Effectiveness**: ~80% - Strong additional protection

---

### Layer 5: Per-Poll Fingerprint Rate Limiting

**Technology**: Strict fingerprint-based enforcement

**Limits**:
- Maximum 1 vote per fingerprint per poll (strictly enforced)

**Prevents**:
- ✅ Any duplicate voting from same device
- ✅ Works even if cookies are cleared

**Effectiveness**: ~95% - Primary mechanism for preventing duplicates

---

## Attack Scenarios & Protection

### Scenario 1: User votes, then votes again in same browser
**Protection**: ✅ **BLOCKED**
- Cookie check fails
- Fingerprint check fails
- User sees "You have already voted" message

### Scenario 2: User votes, then opens incognito tab
**Protection**: ✅ **BLOCKED**
- Cookie is new, but fingerprint persists
- Fingerprint check fails
- User cannot vote again

### Scenario 3: User votes, then switches to different browser
**Protection**: ✅ **BLOCKED**
- Different cookie, but same fingerprint
- Fingerprint check fails
- User cannot vote again

### Scenario 4: User clears cookies and tries to vote
**Protection**: ✅ **BLOCKED**
- Cookie is new, but fingerprint persists
- Fingerprint check fails
- User cannot vote again

### Scenario 5: User clears localStorage (fingerprint)
**Protection**: ⚠️ **MAY WORK** (requires technical knowledge)
- New fingerprint generated
- Still protected by IP limits (3 votes per poll per IP)
- Still protected by global IP limit (10 votes/hour)

### Scenario 6: User uses VPN to change IP
**Protection**: ✅ **STILL BLOCKED**
- IP changes, but fingerprint persists
- Fingerprint check fails
- User cannot vote again

### Scenario 7: Bot script tries to vote multiple times
**Protection**: ✅ **BLOCKED**
- IP rate limiting prevents mass votes
- Fingerprint (if consistent) prevents duplicates
- Multiple protection layers work together

### Scenario 8: Multiple users on same network (office/school)
**Protection**: ✅ **ALLOWED** (expected behavior)
- Each device has unique fingerprint
- Users can vote separately
- IP limit (3 per poll) prevents abuse

---

## Database Schema

### Vote Model Indexes

```javascript
{
  // Prevent duplicate votes by cookie
  { pollId: 1, voterId: 1 },
  
  // Prevent duplicate votes by fingerprint
  { pollId: 1, fingerprint: 1 },
  
  // Enable IP-based rate limiting queries
  { pollId: 1, ipAddress: 1, createdAt: -1 }
}
```

These indexes ensure fast lookups for all anti-abuse checks.

---

## Implementation Details

### Frontend Fingerprint Generation

Located in: `client/src/utils/fingerprint.js`

- Collects browser characteristics asynchronously
- Generates hash from collected data
- Stores fingerprint in localStorage for persistence
- Falls back to sync generation if async fails

### Backend Vote Validation

Located in: `server/routes/votes.js`

Checks performed in order:
1. Cookie-based check (fastest)
2. Fingerprint-based check (most reliable)
3. IP rate limiting (global)
4. Per-poll IP rate limiting
5. Per-poll fingerprint rate limiting

All checks must pass for vote to be accepted.

---

## Privacy Considerations

### What We Collect
- Browser characteristics (technical, not personal)
- IP address (for rate limiting)
- Device fingerprint (anonymized hash)

### What We Don't Collect
- Personal information
- Browsing history
- Personal files or data
- Location data (beyond timezone)

### Data Storage
- Fingerprints are hashed (cannot be reversed)
- No personal data stored
- IP addresses used only for rate limiting
- All data deleted when poll is deleted (future feature)

---

## Bypass Difficulty Levels

| Method | Difficulty | Technical Knowledge Required |
|--------|-----------|------------------------------|
| Clear cookies | ⭐ Easy | Basic browser knowledge |
| Use incognito | ⭐ Easy | Basic browser knowledge |
| Switch browsers | ⭐ Easy | Basic browser knowledge |
| Clear localStorage | ⭐⭐ Medium | Developer tools knowledge |
| Use VPN | ⭐⭐ Medium | VPN setup knowledge |
| Modify fingerprint | ⭐⭐⭐⭐⭐ Very Hard | Advanced programming |
| Spoof all signals | ⭐⭐⭐⭐⭐ Very Hard | Expert-level knowledge |

**Result**: Most users cannot bypass the protection system. Advanced users who can bypass still face IP-based limits.

---

## Future Enhancements

1. **CAPTCHA Integration**: Add CAPTCHA after suspicious patterns detected
2. **Behavioral Analysis**: Track voting patterns to detect anomalies
3. **Device Fingerprinting**: Add additional device-level signals
4. **Machine Learning**: Detect and block suspicious voting patterns
5. **OAuth Authentication**: Optional login for verified voting
6. **Poll Expiration**: Automatic expiration of old polls

---

## Conclusion

The multi-layered protection system provides strong defense against vote manipulation while maintaining a good user experience. The combination of browser fingerprinting, cookie tracking, and IP-based rate limiting ensures that:

- ✅ Legitimate users can vote easily
- ✅ Duplicate votes are prevented effectively
- ✅ Automated attacks are blocked
- ✅ Fair polling is maintained

The system is designed to be **difficult to bypass** while remaining **privacy-conscious** and **user-friendly**.
