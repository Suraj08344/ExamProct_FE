# HTTPS Setup for Mobile Testing

## Option 1: Using ngrok (Recommended)

### Step 1: Start your backend server
```bash
cd exam-proctor-backend
npm start
```

### Step 2: Start your frontend server
```bash
cd exam-proctor
npm start
```

### Step 3: Create HTTPS tunnel with ngrok
```bash
# For frontend (port 3000)
ngrok http 3000

# For backend (port 5000)
ngrok http 5000
```

### Step 4: Update API URLs
Once ngrok is running, it will provide HTTPS URLs like:
- Frontend: `https://abc123.ngrok.io`
- Backend: `https://xyz789.ngrok.io`

Update your frontend API configuration to use the HTTPS backend URL.

## Option 2: Using mkcert (Local HTTPS)

### Step 1: Install mkcert
```bash
# On macOS
brew install mkcert
mkcert -install

# On Windows
choco install mkcert
mkcert -install

# On Linux
sudo apt install mkcert
mkcert -install
```

### Step 2: Generate certificates
```bash
cd exam-proctor
mkcert localhost 127.0.0.1 ::1
```

### Step 3: Create .env file
```bash
# Create .env file in exam-proctor directory
HTTPS=true
SSL_CRT_FILE=localhost+2.pem
SSL_KEY_FILE=localhost+2-key.pem
```

### Step 4: Start with HTTPS
```bash
npm start
```

## Option 3: Using Vite (Alternative to Create React App)

If you want to switch to Vite for better HTTPS support:

```bash
npm install -g create-vite
create-vite exam-proctor-vite --template react-ts
cd exam-proctor-vite
npm install
npm run dev -- --host --https
```

## Testing on Mobile

1. Make sure your mobile device and computer are on the same network
2. Use the HTTPS URL provided by ngrok or your local HTTPS setup
3. The camera permissions should now work on mobile devices

## Troubleshooting

- If ngrok shows "tunnel not found", try a different port
- If certificates don't work, try ngrok instead
- Make sure your firewall allows the connections
- For iOS devices, Safari works best with HTTPS 