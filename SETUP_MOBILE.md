# Mobile Testing Setup Guide - TalentForge

This guide helps you test the TalentForge app on a real phone or tablet on your local network.

## Problem
- **Mobile cannot access localhost (127.0.0.1)** - That refers to the phone itself, not your PC
- **Solution:** Use your PC's local network IP address instead

## Prerequisites
- TalentForge frontend running on `http://localhost:5173` (dev server)
- TalentForge backend running on `http://localhost:5002` (Flask server)
- Phone/tablet on the same WiFi network as your PC

## Step-by-Step Setup

### 1. Find Your PC's Local IP Address

**Windows (PowerShell):**
```powershell
ipconfig | findstr "IPv4"
```
Look for the line starting with `IPv4 Address` in your active network. Example: `192.168.1.100`

**Windows (Command Prompt):**
```cmd
ipconfig
```

**Linux/Mac:**
```bash
ifconfig | grep inet
```

### 2. Update Frontend Environment

Create or edit `frontend/.env`:

```env
VITE_API_URL=http://<YOUR_PC_IP>:5002
```

**Example:**
```env
VITE_API_URL=http://192.168.1.100:5002
```

### 3. Start the Backend (Flask)

From the project root:
```bash
cd flask_server
python app.py
```

You should see:
```
Starting Flask server... (host=0.0.0.0 port=5002 debug=False)
Running on http://0.0.0.0:5002
```

### 4. Start the Frontend (Vite Dev Server)

From the project root:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v... ready in ... ms

➜ Local: http://localhost:5173/
➜ Network: http://<YOUR_PC_IP>:5173/
```

### 5. Connect from Mobile

Open a browser on your phone and go to:
```
http://<YOUR_PC_IP>:5173
```

**Example:**
```
http://192.168.1.100:5173
```

## Troubleshooting

### Backend unreachable error
- **Check:** Is Flask running? `python flask_server/app.py` in a terminal
- **Check:** Is your PC's IP correct? Run `ipconfig` again
- **Check:** Is the phone on the same WiFi? Join the same network
- **Check:** Firewall? Allow Flask port 5002 or disable firewall temporarily

### "Could not reach the server" on login
- Verify `VITE_API_URL=http://<YOUR_PC_IP>:5002` is in `frontend/.env`
- Restart the dev server after changing .env: `Ctrl+C` then `npm run dev`
- Check Flask is running and logs show requests from your phone

### Page won't load
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Clear browser cache
- Try in a different browser

## Environment Variables Explained

| Variable | Purpose | Dev Value | Mobile Value |
|----------|---------|-----------|--------------|
| `VITE_API_URL` | Backend API endpoint | (empty = relative) | `http://192.168.1.100:5002` |
| `FLASK_DEBUG` | Flask debug mode | `1` or `true` | `0` or `false` |
| `FLASK_RUN_PORT` | Flask port | `5002` | `5002` |

## Testing Features on Mobile

Once connected:

1. **Sign In:** Test login with valid credentials
2. **Job Listing:** Browse jobs with full functionality
3. **Job Details:** Verify text is readable (high contrast)
4. **Application Tracker:** Drag-and-drop between columns
5. **Resume Analyzer:** Upload and get feedback
6. **AI Interview:** Practice with AI (if OPENAI_API_KEY set)

## Performance Tips

- **Keep PC and phone nearby** for stable WiFi signal
- **Monitor network activity** - Flask logs will show every request
- **Use Chrome DevTools** on mobile: `chrome://inspect`
- **Test different orientations:** Portrait and landscape layouts

## Production Deployment

When deploying to production:

1. Deploy **backend** to Render/Heroku (get URL: `https://your-api.com`)
2. Set **`VITE_API_URL`** environment variable in Vercel: `https://your-api.com`
3. Deploy **frontend** to Vercel
4. Test live: `https://your-deployed-frontend.vercel.app`

## Common Use Cases

### Test on tablet
```env
VITE_API_URL=http://192.168.1.100:5002
```
Navigate: `http://192.168.1.100:5173`

### Test multiple phones
```
Phone 1: http://192.168.1.100:5173
Phone 2: http://192.168.1.100:5173
Tablet: http://192.168.1.100:5173
```
All use same backend, same PC IP

### AWS/Heroku backend + local frontend
```env
VITE_API_URL=https://your-heroku-api.herokuapp.com
```
Navigate: `http://192.168.1.100:5173`

## Firewall Configuration

If you get "Connection refused":

**Windows Defender Firewall:**
1. Settings → Privacy & Security → Windows Defender Firewall
2. Allow an app → Microsoft Defender Firewall
3. Find Python and check both boxes
4. Or allow port 5002: Advanced → Inbound Rules → New Rule

**macOS:**
System Preferences → Security & Privacy → Firewall Options → Allow Python

**Linux:**
```bash
sudo ufw allow 5002
sudo ufw allow 5173
```

## Questions?

- Check Flask logs for backend errors
- Check browser console (F12) for frontend errors
- Verify network connectivity: `ping <YOUR_PC_IP>` from phone (might not work, but try)
- Check both services are running: `netstat -ano | findstr "5002\|5173"` (Windows)
