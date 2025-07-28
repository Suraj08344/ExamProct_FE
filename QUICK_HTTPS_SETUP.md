# Quick HTTPS Setup for Mobile Camera Access

## The Problem
Mobile browsers require HTTPS for camera access. Your error "HTTPS is required for camera access on mobile devices" is expected behavior.

## Quick Solution (5 minutes)

### Step 1: Start your servers
```bash
# Terminal 1 - Backend
cd exam-proctor-backend
npm start

# Terminal 2 - Frontend  
cd exam-proctor
npm start
```

### Step 2: Create HTTPS tunnel
```bash
# Terminal 3 - Create HTTPS tunnel for frontend
ngrok http 3000
```

### Step 3: Update API configuration
1. Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)
2. Open `exam-proctor/src/config/api.js`
3. Replace `https://your-ngrok-backend-url.ngrok.io/api` with your actual ngrok URL + `/api`

Example:
```javascript
const DEV_HTTPS_URL = 'https://abc123.ngrok.io/api';
```

### Step 4: Test on mobile
1. Open the ngrok HTTPS URL on your mobile device
2. Camera permissions should now work!

## Alternative: Use the provided script
```bash
cd exam-proctor
./start-https.sh
```

## Troubleshooting

### If ngrok shows "tunnel not found":
- Try a different port: `ngrok http 3001`
- Check if port 3000 is already in use

### If camera still doesn't work:
- Make sure you're using the HTTPS URL (starts with `https://`)
- Try Chrome browser on mobile
- Check browser console for detailed error messages

### If backend connection fails:
- Create a second ngrok tunnel for backend: `ngrok http 5001`
- Update the `DEV_HTTPS_URL` in the config file

## Next Steps
Once HTTPS is working, you can:
1. Test the full exam flow on mobile
2. Verify camera and microphone permissions
3. Test screen sharing (if supported on mobile)

The improved error handling will now show you exactly what's wrong if there are any issues! 