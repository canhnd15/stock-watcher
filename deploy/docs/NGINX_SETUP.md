# Nginx Setup Guide - Simple Steps

This guide will help you set up Nginx to serve your Stock Watcher application. **No CORS configuration needed!**

> **Note:** If you don't have `runtime/nginx.conf` file, don't worry! This guide will show you how to create it. The deployment script only creates it if Nginx is already installed. You can create it manually using the template provided.

---

## Quick Start (5 Steps)

1. **Install Nginx**
   ```bash
   sudo apt update && sudo apt install nginx -y
   ```

2. **Create configuration file** (if you don't have `runtime/nginx.conf`)
   ```bash
   # Option 1: Use template
   cp /path/to/stock-watcher/deploy/nginx.conf.template /path/to/stock-watcher/runtime/nginx.conf
   
   # Option 2: Create directly in Nginx directory
   sudo nano /etc/nginx/sites-available/stock-watcher
   # (Then paste the config from "Complete Configuration Template" section below)
   ```

3. **Copy and enable the site**
   ```bash
   # If you created it in runtime/, copy it:
   sudo cp /path/to/stock-watcher/runtime/nginx.conf /etc/nginx/sites-available/stock-watcher
   
   # Enable the site
   sudo ln -s /etc/nginx/sites-available/stock-watcher /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default  # Remove default site
   ```

4. **Edit configuration** (update paths and server name)
   ```bash
   sudo nano /etc/nginx/sites-available/stock-watcher
   # Update: root path and server_name
   ```

5. **Test and reload**
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

**Done!** Access your app at `http://your-server-ip`

---

## Detailed Steps

### Step 1: Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

**CentOS/RHEL:**
```bash
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Verify installation:**
```bash
nginx -v
sudo systemctl status nginx
```

---

### Step 2: Create Your Configuration File

**Option A: Use the template (Recommended)**

```bash
# Copy the template file
cp /path/to/stock-watcher/deploy/nginx.conf.template /path/to/stock-watcher/runtime/nginx.conf

# Edit the file
nano /path/to/stock-watcher/runtime/nginx.conf
```

**Option B: Create it manually**

```bash
# Find your frontend files location first
ls -la ~/stock-watcher/runtime/frontend/
# or
ls -la /opt/stock-watcher/runtime/frontend/

# Create the config file
nano /path/to/stock-watcher/runtime/nginx.conf
```

Then paste the configuration template below (see "Complete Configuration Template" section).

**Note the full path to your frontend files** - you'll need it in the next step.

---

### Step 3: Install Configuration

**If you have the file at `runtime/nginx.conf`:**
```bash
# Copy config file
sudo cp /path/to/stock-watcher/runtime/nginx.conf /etc/nginx/sites-available/stock-watcher
```

**If you don't have the file, create it directly:**
```bash
# Create the config file directly in Nginx directory
sudo nano /etc/nginx/sites-available/stock-watcher
```

Then paste the configuration from the "Complete Configuration Template" section below.

**After creating/copying the file:**
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/stock-watcher /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

---

### Step 4: Edit Configuration

Edit the configuration file to match your setup:

```bash
sudo nano /etc/nginx/sites-available/stock-watcher
```

**Update these two lines:**

1. **`root`** - Path to your frontend files:
   ```nginx
   root /home/youruser/stock-watcher/runtime/frontend;  # Change this
   ```

2. **`server_name`** - Your server IP or domain:
   ```nginx
   server_name 184.174.33.158 localhost;  # Change IP to yours
   # or if you have a domain:
   server_name yourdomain.com www.yourdomain.com;
   ```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 5: Test and Apply

```bash
# Test configuration (must show "syntax is ok")
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

### Step 6: Verify It Works

1. **Check Nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Test in browser:**
   - Open: `http://your-server-ip`
   - You should see your Stock Watcher login page

3. **Test API:**
   ```bash
   curl http://your-server-ip/api/trades
   ```

4. **Check logs if needed:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

---

## Complete Configuration Template

Here's the complete configuration file you need:

```nginx
server {
    listen 80;
    server_name YOUR_IP_OR_DOMAIN localhost;  # ← Change this
    
    # Path to your frontend files
    root /path/to/stock-watcher/runtime/frontend;  # ← Change this
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Serve frontend files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to backend
    location /api {
        proxy_pass http://localhost:8899;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket
    location /ws {
        proxy_pass http://localhost:8899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Common Issues & Fixes

### ❌ 502 Bad Gateway

**Problem:** Backend not running

**Fix:**
```bash
# Check if backend is running
ps aux | grep java

# Start backend
cd /path/to/stock-watcher
./deploy/scripts/deploy.sh start
```

### ❌ 404 Not Found

**Problem:** Wrong path to frontend files

**Fix:**
```bash
# Check if files exist
ls -la /path/to/stock-watcher/runtime/frontend/

# Fix permissions
sudo chown -R www-data:www-data /path/to/stock-watcher/runtime/frontend
sudo chmod -R 755 /path/to/stock-watcher/runtime/frontend
```

### ❌ 403 Forbidden

**Problem:** Permission issues

**Fix:**
```bash
sudo chown -R www-data:www-data /path/to/stock-watcher/runtime/frontend
sudo chmod -R 755 /path/to/stock-watcher/runtime/frontend
```

### ❌ Can't Access from Browser

**Problem:** Firewall blocking port 80

**Fix:**
```bash
# Allow port 80
sudo ufw allow 80/tcp
sudo ufw reload

# Or for CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### ❌ Configuration Test Fails

**Problem:** Syntax error in config file

**Fix:**
```bash
# Check error message
sudo nginx -t

# Common mistakes:
# - Missing semicolon (;)
# - Wrong path (check if directory exists)
# - Typo in server_name
```

---

## Using Custom Port (8089)

If you want to use port 8089 instead of 80:

1. **Edit config:**
   ```nginx
   listen 8089;  # Change from 80 to 8089
   ```

2. **Open firewall:**
   ```bash
   sudo ufw allow 8089/tcp
   ```

3. **Access:** `http://your-server-ip:8089`

---

## SSL/HTTPS Setup (Optional)

### Quick Setup with Let's Encrypt

**Prerequisites:** Domain name pointing to your server

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts - Certbot will configure everything automatically!
```

That's it! Your site will now work on HTTPS and HTTP will redirect to HTTPS.

**Auto-renewal:** Certbot sets this up automatically. Test it:
```bash
sudo certbot renew --dry-run
```

---

## Useful Commands

```bash
# Test configuration
sudo nginx -t

# Reload (apply changes without downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# View your config
sudo cat /etc/nginx/sites-available/stock-watcher
```

---

## File Locations

- **Config file:** `/etc/nginx/sites-available/stock-watcher`
- **Enabled sites:** `/etc/nginx/sites-enabled/`
- **Logs:** `/var/log/nginx/`
- **Test config:** `sudo nginx -t`

---

## Summary Checklist

- [ ] Nginx installed
- [ ] Configuration file copied to `/etc/nginx/sites-available/stock-watcher`
- [ ] Site enabled (symlink created)
- [ ] Configuration edited (root path and server_name updated)
- [ ] Configuration tested (`sudo nginx -t`)
- [ ] Nginx reloaded
- [ ] Frontend accessible in browser
- [ ] API working (`curl http://your-ip/api/trades`)
- [ ] Firewall allows port 80 (or 8089)

**Done!** Your application is now accessible through Nginx. No CORS issues! 🎉

---

## Need Help?

1. **Check Nginx status:** `sudo systemctl status nginx`
2. **Check error logs:** `sudo tail -50 /var/log/nginx/error.log`
3. **Test backend directly:** `curl http://localhost:8899/api/trades`
4. **Verify frontend files exist:** `ls -la /path/to/frontend/`
