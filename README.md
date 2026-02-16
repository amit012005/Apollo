# 🚀 Apollo Poll - Real-Time Polling Application

A full-stack web application for creating polls, sharing them via links, and collecting votes with real-time result updates.

## Features

✅ **Poll Creation** - Create polls with custom questions and multiple options  
✅ **Shareable Links** - Generate unique URLs for each poll  
✅ **Real-Time Updates** - See vote results update instantly using WebSockets  
✅ **Anti-Abuse Protection** - Multiple mechanisms to prevent vote manipulation  
✅ **Persistent Storage** - All polls and votes saved in MongoDB  
✅ **Responsive Design** - Works seamlessly on desktop and mobile devices  

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Real-Time**: Socket.io
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## Project Structure

```
apollo/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── CreatePoll.jsx
│   │   │   └── ViewPoll.jsx
│   │   ├── App.jsx        # Main app component
│   │   ├── App.css        # Styles
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── models/           # MongoDB schemas
│   │   ├── Poll.js
│   │   └── Vote.js
│   ├── routes/           # API routes
│   │   ├── polls.js
│   │   └── votes.js
│   └── index.js          # Server entry point
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/pollapp
PORT=5000
CLIENT_URL=http://localhost:5173
```

For production, use MongoDB Atlas connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pollapp
```

Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000
```

### Step 3: Start MongoDB

Make sure MongoDB is running locally, or use MongoDB Atlas cloud service.

### Step 4: Run the Application

**Development mode (runs both server and client):**
```bash
npm run dev
```

**Or run separately:**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## API Endpoints

### Create Poll
```
POST /api/polls
Body: {
  "question": "Your question?",
  "options": ["Option 1", "Option 2", "Option 3"]
}
```

### Get Poll
```
GET /api/polls/:pollId
```

### Vote on Poll
```
POST /api/votes
Body: {
  "pollId": "uuid",
  "optionIndex": 0
}
```

### Check Vote Status
```
GET /api/votes/check/:pollId
```

## Anti-Abuse Mechanisms

The application implements **five layers of protection** to prevent vote manipulation:

### 1. Cookie-Based Voter Tracking
- **How it works**: Each user receives a unique `voterId` stored in an HTTP-only cookie when they first visit the application
- **What it prevents**: 
  - Users voting multiple times on the same poll from the same browser session
  - Prevents simple refresh-and-vote attacks
- **Limitations**: 
  - Users can clear cookies to vote again (requires technical knowledge)
  - Different browsers/devices allow multiple votes from the same person
  - Incognito/private browsing creates new voter IDs

### 2. Browser Fingerprinting (NEW - Primary Protection)
- **How it works**: Creates a unique fingerprint based on browser characteristics:
  - Canvas fingerprinting (rendering characteristics)
  - WebGL fingerprinting (GPU characteristics)
  - Audio fingerprinting (audio processing characteristics)
  - Screen resolution, color depth, timezone
  - Hardware concurrency, device memory
  - Browser plugins and capabilities
  - Combined with a persistent device ID stored in localStorage
- **What it prevents**: 
  - ✅ **Multiple votes from different browsers** on the same device
  - ✅ **Multiple votes from incognito/private tabs** on the same device
  - ✅ **Vote manipulation using different browser sessions**
  - ✅ **Device-based duplicate voting**
- **Effectiveness**: Very high - fingerprint persists across browser sessions and incognito modes
- **Limitations**: 
  - Users can clear localStorage (requires technical knowledge)
  - Different physical devices can still vote separately (expected behavior)
  - Advanced users with privacy tools might have similar fingerprints

### 3. IP-Based Rate Limiting (Global)
- **How it works**: Tracks votes by IP address and limits to 10 votes per hour per IP across all polls
- **What it prevents**: 
  - Automated bot attacks
  - Mass voting from a single location/network
  - Script-based vote manipulation
- **Limitations**: 
  - Users behind shared networks (offices, schools) share the same IP
  - VPNs can bypass IP restrictions

### 4. Per-Poll IP Rate Limiting (NEW)
- **How it works**: Limits to 3 votes per IP address per poll within 24 hours
- **What it prevents**: 
  - Multiple votes on the same poll from the same network/IP
  - Prevents abuse even if fingerprint is cleared
- **Effectiveness**: High - adds extra layer of protection

### 5. Per-Poll Fingerprint Rate Limiting (NEW)
- **How it works**: Allows only 1 vote per fingerprint per poll (enforced strictly)
- **What it prevents**: 
  - Any duplicate voting from the same device/browser combination
  - Works even if cookies are cleared
- **Effectiveness**: Very high - primary mechanism for preventing duplicate votes

### Additional Protections
- **Database Constraints**: Multiple compound indexes prevent duplicate votes at database level:
  - `pollId + voterId` (cookie-based)
  - `pollId + fingerprint` (fingerprint-based)
  - `pollId + ipAddress` (IP-based)
- **Validation**: Server-side validation ensures data integrity
- **HTTP-Only Cookies**: Prevents JavaScript access to voter IDs, reducing XSS attack vectors
- **Combined Checks**: All mechanisms work together for maximum protection

### Protection Effectiveness

| Attack Method | Protection Level | Notes |
|--------------|----------------|-------|
| Same browser, same tab | ✅ **Blocked** | Cookie + Fingerprint |
| Same browser, incognito | ✅ **Blocked** | Fingerprint persists |
| Different browser, same device | ✅ **Blocked** | Fingerprint + Device ID |
| Clear cookies | ✅ **Blocked** | Fingerprint still active |
| Clear localStorage | ⚠️ **May work** | Requires technical knowledge |
| Different device | ✅ **Allowed** | Expected behavior |
| VPN/Proxy | ⚠️ **Partial** | IP limit may apply |
| Bot scripts | ✅ **Blocked** | Fingerprint + IP limits |

### Known Limitations & Future Improvements

1. **LocalStorage Clearing**: Advanced users can clear localStorage to reset fingerprint
   - *Current Protection*: Still protected by IP-based limits
   - *Future Improvement*: Add CAPTCHA after suspicious patterns

2. **Shared IPs**: Multiple users behind same IP are limited together
   - *Current Protection*: Fingerprint distinguishes devices
   - *Future Improvement*: Add device-specific rate limits

3. **VPN Bypass**: VPN users can change IPs easily
   - *Current Protection*: Fingerprint still tracks device
   - *Future Improvement*: Implement CAPTCHA for VPN users

4. **Privacy Tools**: Some privacy-focused browsers may have similar fingerprints
   - *Current Protection*: Combined with IP and cookie checks
   - *Future Improvement*: Add behavioral analysis

5. **No User Authentication**: Anyone can vote without account
   - *Future Improvement*: Add optional OAuth login for verified voting

6. **No Poll Expiration**: Polls exist indefinitely
   - *Future Improvement*: Add expiration dates and archive old polls

## Edge Cases Handled

✅ **Empty Options**: Prevents creating polls with empty option text  
✅ **Minimum Options**: Ensures at least 2 options are required  
✅ **Invalid Poll IDs**: Returns 404 for non-existent polls  
✅ **Invalid Option Index**: Validates option index before voting  
✅ **Duplicate Votes**: Prevents same user from voting twice  
✅ **Concurrent Updates**: Socket.io handles real-time updates safely  
✅ **Network Errors**: Graceful error handling with user-friendly messages  
✅ **Missing Data**: Validates all required fields before processing  
✅ **Cookie Disabled**: Falls back gracefully if cookies are disabled  
✅ **Long Poll Questions**: Handles long text inputs properly  

## Real-Time Updates

Real-time functionality is achieved using **Socket.io**:

1. When a user opens a poll, they join a Socket.io room for that poll
2. When a vote is cast, the server emits an update to all users in that room
3. All connected clients receive the update instantly without page refresh
4. Vote counts and percentages update in real-time for all viewers

## Deployment

### Option 1: Deploy to Vercel/Netlify (Frontend) + Railway/Render (Backend)

**Backend Deployment (Railway/Render):**
1. Push code to GitHub
2. Connect repository to Railway/Render
3. Set environment variables:
   - `MONGODB_URI`
   - `PORT` (auto-set by platform)
   - `CLIENT_URL` (your frontend URL)
4. Deploy

**Frontend Deployment (Vercel/Netlify):**
1. Connect GitHub repository
2. Set build command: `cd client && npm install && npm run build`
3. Set output directory: `client/dist`
4. Set environment variable: `VITE_API_URL` (your backend URL)
5. Deploy

### Option 2: Full Stack Deployment (Render/Railway)

Both frontend and backend can be deployed on the same platform:
1. Configure build commands for both
2. Set up environment variables
3. Ensure CORS allows your frontend domain

### MongoDB Atlas Setup

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for development)
5. Get connection string and add to `.env`

## Development Notes

- The app uses UUIDs for poll IDs, ensuring uniqueness
- Socket.io rooms are scoped per poll for efficient updates
- Cookies are set with `httpOnly` flag for security
- CORS is configured to allow credentials
- All API responses follow consistent format

## Testing the Application

1. **Create a Poll**: Navigate to home page, enter question and options
2. **Share Link**: Copy the generated link
3. **Open in Incognito**: Test voting from different browser session
4. **Real-Time Test**: Open same poll in multiple tabs/windows, vote from one, see updates in others
5. **Anti-Abuse Test**: Try voting twice from same browser (should be blocked)

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Author

Built as a full-stack assignment demonstrating real-time web application development.

---

**Note**: Remember to update environment variables for production deployment and ensure MongoDB connection is properly configured.
