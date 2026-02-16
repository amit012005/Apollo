# Deployment Guide

## Quick Deployment Checklist

### 1. Environment Setup

**Backend (.env in root):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pollapp
PORT=5000
CLIENT_URL=https://your-frontend-domain.com
```

**Frontend (.env in client folder):**
```env
VITE_API_URL=https://your-backend-domain.com
```

### 2. Build Commands

**Backend:**
- No build needed, runs directly with Node.js
- Ensure `node_modules` are installed

**Frontend:**
```bash
cd client
npm install
npm run build
```
Output will be in `client/dist/`

### 3. Platform-Specific Instructions

#### Vercel (Frontend)
1. Install Vercel CLI: `npm i -g vercel`
2. In `client` directory: `vercel`
3. Set environment variable: `VITE_API_URL`
4. Build command: `npm run build`
5. Output directory: `dist`

#### Netlify (Frontend)
1. Connect GitHub repo
2. Base directory: `client`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_API_URL`

#### Railway (Backend)
1. Connect GitHub repo
2. Root directory: `.`
3. Start command: `node server/index.js`
4. Add environment variables from `.env`

#### Render (Backend)
1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `node server/index.js`
5. Add environment variables

### 4. MongoDB Atlas Setup

1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Network Access: Add IP `0.0.0.0/0` (or specific IPs)
4. Get connection string
5. Replace `<password>` with actual password
6. Add to backend `.env` as `MONGODB_URI`

### 5. CORS Configuration

Ensure `CLIENT_URL` in backend matches your frontend domain exactly (including https://)

### 6. Testing After Deployment

1. Create a poll
2. Copy share link
3. Open in incognito/private window
4. Vote and verify real-time updates
5. Test anti-abuse (try voting twice)

## Common Issues

**Socket.io not connecting:**
- Check `VITE_API_URL` is set correctly
- Ensure CORS allows your frontend domain
- Verify backend is running and accessible

**MongoDB connection errors:**
- Check connection string format
- Verify IP whitelist includes your server IP
- Ensure database user credentials are correct

**CORS errors:**
- Update `CLIENT_URL` in backend `.env`
- Restart backend server after changing env vars
