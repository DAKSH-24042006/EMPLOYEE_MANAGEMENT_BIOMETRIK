# Biometrik Systems — Employee & Project Workspace Management

Production-grade, full-stack enterprise workspace built for **Biometrik® Systems**. This platform manages the complete client project lifecycle, agile sprint boards, prioritized work items, personal to-do trackers, team collaboration chat, automated deadline email notifications with embedded brand signatures, Project Drive document storage, and branded client PDF specification reports.

---

## Table of Contents

1. [System Architecture & Technology Stack](#1-system-architecture--technology-stack)
2. [Roles & Access Control Matrix (RBAC)](#2-roles--access-control-matrix-rbac)
3. [Server Hardware & Software Prerequisites](#3-server-hardware--software-prerequisites)
4. [Environment Variables Reference (`.env.local`)](#4-environment-variables-reference-envlocal)
5. [Complete Server Deployment Guide (Ubuntu / Debian VPS)](#5-complete-server-deployment-guide-ubuntu--debian-vps)
   - [Step 1: Update System & Install Node.js 20 LTS](#step-1-update-system--install-nodejs-20-lts)
   - [Step 2: Install & Start MongoDB](#step-2-install--start-mongodb)
   - [Step 3: Clone Codebase & Install Dependencies](#step-3-clone-codebase--install-dependencies)
   - [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
   - [Step 5: Bootstrap Initial System Administrator](#step-5-bootstrap-initial-system-administrator)
   - [Step 6: Build the Production Next.js Bundle](#step-6-build-the-production-nextjs-bundle)
   - [Step 7: Configure & Start PM2 Process Manager](#step-7-configure--start-pm2-process-manager)
   - [Step 8: Configure Nginx Reverse Proxy (with 35MB Uploads)](#step-8-configure-nginx-reverse-proxy-with-35mb-uploads)
   - [Step 9: Secure with Free Let's Encrypt SSL (HTTPS)](#step-9-secure-with-free-lets-encrypt-ssl-https)
   - [Step 10: Configure UFW Server Firewall](#step-10-configure-ufw-server-firewall)
6. [Automated Daily Deadline Reminders (Cron Setup)](#6-automated-daily-deadline-reminders-cron-setup)
7. [Configuring Outbound Email (SMTP) via Admin Web UI](#7-configuring-outbound-email-smtp-via-admin-web-ui)
8. [Project Drive File Uploads & Storage Management](#8-project-drive-file-uploads--storage-management)
9. [Routine Maintenance, Backups & Operational Commands](#9-routine-maintenance-backups--operational-commands)
10. [Production Troubleshooting Scenarios](#10-production-troubleshooting-scenarios)

---

## 1. System Architecture & Technology Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & Component System**: [Ant Design v6 (antd)](https://ant.design/) & [Tailwind CSS](https://tailwindcss.com/)
- **Iconography**: [Lucide React](https://lucide.dev/) & [@ant-design/icons](https://ant.design/components/icon)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose ORM](https://mongoosejs.com/)
- **Authentication**: Stateless JWT session tokens (`jose`) stored in secure, HTTP-only cookies
- **Email Delivery Engine**: [Nodemailer](https://nodemailer.com/) with responsive HTML templates, inline CID logo attachment, and dynamic token interpolation
- **Document Generation**: [jsPDF](https://github.com/parallax/jsPDF) for branded corporate PDF project specifications
- **Data Visualizations**: [Recharts](https://recharts.org/) for executive delivery KPIs and status metrics
- **Language**: TypeScript 5+ (Strict Mode)

---

## 2. Roles & Access Control Matrix (RBAC)

| Feature / Action | `SYSTEM_ADMIN` | `ADMIN` | `Project Manager` | Employee / Team Member |
| :--- | :---: | :---: | :---: | :---: |
| **User Management (`/admin`)** | Full Access | Limited (`/users`) | No Access | No Access |
| **SMTP & Email Config** | Full Access | View Only | No Access | No Access |
| **Create New Project** | Yes | Yes | No | No |
| **Assign Project Manager & Team** | Yes | Yes | No | No |
| **View Project Workspace** | All Projects | All Projects | Assigned Projects | Assigned Projects |
| **View Project Activity Logs** | Yes | Yes | Yes | **No (403)** |
| **Create & Assign Work Items** | Yes | Yes | Yes | Self-Tasks Only |
| **Manage Agile Sprints** | Yes | Yes | Yes | No |
| **Upload to Project Drive** | Yes | Yes | Yes | Yes |
| **Participate in Project Chat** | Yes | Yes | Yes | Yes |

---

## 3. Server Hardware & Software Prerequisites

### Recommended Server Specifications
- **Operating System**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (Debian 12 also supported)
- **CPU**: 2 vCPUs minimum (4 vCPUs recommended for 50+ concurrent users)
- **RAM**: 4 GB RAM minimum (Next.js build requires ~2 GB during compilation)
- **Disk**: 30+ GB SSD storage (adjust according to Project Drive attachment usage)

### Required Software Packages
- Node.js: `v20.x` or `v22.x` (LTS)
- Package Manager: `npm` (v9+)
- Database: MongoDB 6.0+ or MongoDB 7.0+ (Local or MongoDB Atlas)
- Reverse Proxy: Nginx
- Process Manager: PM2
- SSL: Certbot with Nginx plugin

---

## 4. Environment Variables Reference (`.env.local`)

Copy `.env.example` to `.env.local` and populate the required keys:

```bash
cp .env.example .env.local
```

### Configuration Table

| Variable | Required | Default | Description | Example |
| :--- | :---: | :---: | :--- | :--- |
| `PORT` | No | `3000` | Port on which the Next.js app listens locally | `3000` |
| `NODE_ENV` | Yes | `production` | Execution mode (`production` for live server) | `production` |
| `NEXT_PUBLIC_APP_URL` | Yes | - | Full public HTTPS URL of your workspace | `https://workspace.yourdomain.com` |
| `APP_URL` | Yes | - | Fallback server URL for outgoing email links | `https://workspace.yourdomain.com` |
| `MONGODB_URI` | Yes | - | MongoDB connection URI (Local or Atlas) | `mongodb://localhost:27017/biometrik_workspace` |
| `JWT_SECRET` | Yes | - | Secure 32+ character key for JWT cookie signing | `openssl rand -base64 32` |
| `SMTP_HOST` | Yes | - | Outbound SMTP mail server host | `smtp.gmail.com` or `smtp.office365.com` |
| `SMTP_PORT` | Yes | `587` | Outbound SMTP mail server port | `587` |
| `SMTP_SECURE` | Yes | `false` | `true` for port 465 (SSL), `false` for port 587 (TLS) | `false` |
| `SMTP_USER` | Yes | - | Outbound SMTP username / email address | `notifications@yourdomain.com` |
| `SMTP_PASS` | Yes | - | Outbound SMTP app password / access key | `mhtbuealhokipbfq` |
| `SMTP_FROM` | Yes | - | Displayed "From" sender address in emails | `notifications@yourdomain.com` |
| `SMTP_FROM_NAME` | No | - | Displayed sender name | `"Biometrik Systems Notifications"` |
| `CRON_SECRET` | Yes | - | Secret token protecting the deadline reminder runner | `openssl rand -hex 24` |

---

## 5. Complete Server Deployment Guide (Ubuntu / Debian VPS)

### Step 1: Update System & Install Node.js 20 LTS

Connect to your server via SSH as `root` or a `sudo` user:

```bash
# 1. Update system repositories
sudo apt update && sudo apt upgrade -y

# 2. Install essential utilities and build dependencies
sudo apt install -y curl wget git build-essential ufw

# 3. Install Node.js 20.x LTS repository from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Verify Node.js and npm versions
node -v   # Expected: v20.x.x
npm -v    # Expected: 10.x.x

# 5. Install PM2 process manager globally
sudo npm install -g pm2
```

---

### Step 2: Install & Start MongoDB

*(Skip this step if using a remote MongoDB Atlas connection string).*

```bash
# 1. Import MongoDB 7.0 GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# 2. Add MongoDB repository to APT sources
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Update repositories and install MongoDB Community Edition
sudo apt update
sudo apt install -y mongodb-org

# 4. Enable and start MongoDB service
sudo systemctl enable mongod
sudo systemctl start mongod

# 5. Confirm MongoDB is active and listening
sudo systemctl status mongod
```

---

### Step 3: Clone Codebase & Install Dependencies

```bash
# 1. Create a dedicated application directory
sudo mkdir -p /var/www/biometrik-workspace
sudo chown -R $USER:$USER /var/www/biometrik-workspace

# 2. Clone the repository into the directory
git clone <YOUR_GITHUB_REPOSITORY_URL> /var/www/biometrik-workspace
cd /var/www/biometrik-workspace

# 3. Create the uploads directory for Project Drive documents
mkdir -p uploads
chmod 755 uploads

# 4. Install production dependencies cleanly
npm ci --legacy-peer-deps
```

---

### Step 4: Configure Environment Variables

Create `.env.local` inside `/var/www/biometrik-workspace`:

```bash
cp .env.example .env.local
nano .env.local
```

Fill in your actual production values:
```env
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://workspace.yourdomain.com
APP_URL=https://workspace.yourdomain.com

MONGODB_URI=mongodb://localhost:27017/biometrik_workspace
JWT_SECRET=your_super_secret_random_64_character_key_here

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=your_google_app_password
SMTP_FROM=notifications@yourdomain.com
SMTP_FROM_NAME="Biometrik Systems Notifications"

CRON_SECRET=your_random_secret_token_for_cron
```
Save and exit (`Ctrl + O`, `Enter`, then `Ctrl + X`).

---

### Step 5: Bootstrap Initial System Administrator

Run the bundled admin seeder to create your initial administrator account:

```bash
node seed_system_admin.js
```

This creates a default administrative account:
- **Username**: `admin`
- **Password**: `admin`
- **Role**: `SYSTEM_ADMIN`
- **Status**: `ACTIVE`

> [!IMPORTANT]
> Immediately after logging in, navigate to **User Management** (`/admin`) and change the `admin` account password to a secure passphrase!

---

### Step 6: Build the Production Next.js Bundle

Compile the TypeScript code and optimize the client bundle:

```bash
npm run build
```
*(Ensure the build finishes with no errors).*

---

### Step 7: Configure & Start PM2 Process Manager

Check the `ecosystem.config.js` file in the project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'biometrik-workspace',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p ' + (process.env.PORT || 3000),
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

Start the application with PM2:

```bash
# 1. Launch the cluster with PM2
pm2 start ecosystem.config.js

# 2. Verify running status
pm2 status

# 3. Save the active process list
pm2 save

# 4. Configure PM2 to automatically start on server reboot
pm2 startup
# (Copy and execute the command printed in terminal by PM2, if requested)
```

---

### Step 8: Configure Nginx Reverse Proxy (with 35MB Uploads)

Install Nginx:

```bash
sudo apt install -y nginx
```

Create a new site configuration file:

```bash
sudo nano /etc/nginx/sites-available/biometrik-workspace
```

Paste the following production Nginx configuration:

```nginx
server {
    listen 80;
    server_name workspace.yourdomain.com;

    # Project Drive file upload size limit (set to 35MB to allow 25MB attachments)
    client_max_body_size 35M;

    # Proxy all traffic to the Next.js PM2 process
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Extended timeouts for large Project Drive uploads and PDF generation
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Cache static Next.js assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Public assets caching
    location /public/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

Enable the configuration and reload Nginx:

```bash
# 1. Enable the configuration via symlink
sudo ln -s /etc/nginx/sites-available/biometrik-workspace /etc/nginx/sites-enabled/

# 2. Remove default Nginx welcome page
sudo rm -f /etc/nginx/sites-enabled/default

# 3. Test configuration syntax
sudo nginx -t

# 4. Reload Nginx
sudo systemctl reload nginx
```

---

### Step 9: Secure with Free Let's Encrypt SSL (HTTPS)

```bash
# 1. Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# 2. Issue and apply SSL certificate (automatically updates Nginx to HTTPS)
sudo certbot --nginx -d workspace.yourdomain.com

# 3. Test automatic SSL renewal
sudo certbot renew --dry-run
```

---

### Step 10: Configure UFW Server Firewall

Lock down your server ports while keeping web access open:

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Enable the firewall
sudo ufw enable
sudo ufw status
```

Your Biometrik Workspace is now live and secured at `https://workspace.yourdomain.com`!

---

## 6. Automated Daily Deadline Reminders (Cron Setup)

The application provides an automated background reminder engine:
- **Task Due Soon**: Sent N days before due date (default: 1 day).
- **Task Due Today**: Sent on deadline morning.
- **Overdue Notice**: Sent repeatedly every N days (default: every 2 days) until completed.

### Setting Up the Server Cron
Open your server crontab:
```bash
crontab -e
```

Add the following line to trigger the reminder sweep every morning at **09:00 AM server time**:
```bash
0 9 * * * curl -s "https://workspace.yourdomain.com/api/cron/check-reminders?token=YOUR_CRON_SECRET" > /tmp/cron_reminders.log 2>&1
```
*(Replace `YOUR_CRON_SECRET` with the token defined in your `.env.local`)*.

---

## 7. Configuring Outbound Email (SMTP) via Admin Web UI

You do not need to restart your server to adjust email settings or edit templates:

1. Log in to the web interface as `admin` (or any `SYSTEM_ADMIN`).
2. Navigate to **User Management** (`/admin`) in the sidebar.
3. Click the **Email & Automated Notifications** tab.
4. Fill in or update your SMTP credentials:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Secure TLS**: Off (for port 587) / On (for port 465)
   - **Username**: Your sending email
   - **Password**: Your 16-character Google App Password
5. Click **"Test SMTP Delivery"** to send a live test message and verify connectivity.
6. Edit subject lines and message bodies using dynamic clickable tags (`{{taskTitle}}`, `{{assigneeName}}`, `{{taskUrl}}`, `{{dueDate}}`, etc.).
7. Click **"Save All Settings"**.

> [!NOTE]
> Every email automatically includes the official **Biometrik Systems Logo** signature embedded via Nodemailer CID attachment (`cid:biometrik-logo`) so it renders in email clients without being blocked as external media.

---

## 8. Project Drive File Uploads & Storage Management

- **Storage Location**: Uploaded project documents are stored on the server's local disk in `/var/www/biometrik-workspace/uploads/`.
- **Upload Limit**: 25 MB per attachment (enforced in `src/app/api/projects/[id]/attachments/route.ts`).
- **Nginx Size Setting**: Ensure `client_max_body_size 35M;` is kept in your Nginx configuration, otherwise Nginx will reject uploads with HTTP 413.
- **Persisting Files across CI/CD Deployments**:
  If using CI/CD pipelines (Jenkins, GitHub Actions) that create a fresh release folder on every build:
  ```bash
  # 1. Create a persistent shared uploads directory
  sudo mkdir -p /var/www/shared_uploads
  sudo chown -R $USER:$USER /var/www/shared_uploads

  # 2. Symlink uploads folder in your deployment script
  ln -sfn /var/www/shared_uploads /var/www/biometrik-workspace/uploads
  ```

---

## 9. Routine Maintenance, Backups & Operational Commands

### Essential PM2 Commands
```bash
# View real-time application logs
pm2 logs biometrik-workspace

# Monitor CPU, RAM, and cluster instances
pm2 monit

# Restart application gracefully
pm2 reload biometrik-workspace

# Stop application
pm2 stop biometrik-workspace
```

### Pulling Updates & Redeploying
When you update the code on GitHub:
```bash
cd /var/www/biometrik-workspace
git pull origin deployment
npm ci --legacy-peer-deps
npm run build
pm2 reload biometrik-workspace
```

### Automated MongoDB Backups
Create a backup script at `/usr/local/bin/backup-mongodb.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y-%m-%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Dump database to compressed archive
mongodump --uri="mongodb://localhost:27017/biometrik_workspace" --archive="$BACKUP_DIR/db_backup_$DATE.gz" --gzip

# Delete backups older than 14 days
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +14 -exec rm {} +
```
Make executable and add to crontab:
```bash
chmod +x /usr/local/bin/backup-mongodb.sh
# Add to crontab: 0 2 * * * /usr/local/bin/backup-mongodb.sh
```

---

## 10. Production Troubleshooting Scenarios

### 1. HTTP 413: "Request Entity Too Large"
- **Cause**: Nginx default file upload size is 1MB.
- **Fix**: Verify `client_max_body_size 35M;` is present in `/etc/nginx/sites-available/biometrik-workspace` and run `sudo systemctl reload nginx`.

### 2. SMTP Error: "535 5.7.8 Authentication Failed"
- **Cause**: Using your primary personal Google password instead of a Google App Password.
- **Fix**: Go to **Google Account** > **Security** > **2-Step Verification** > **App passwords**. Generate a new 16-character password and enter it into `SMTP_PASS`.

### 3. Missing Activity Logs Tab for Team Members
- **Design Behavior**: Activity Logs are restricted to the **Project Manager** (`techOwner`) and **System Administrators**. Regular assigned team members do not see this tab by design.

### 4. Port Conflict on Server Reboot
- **Fix**: Check which process occupies port 3000:
  ```bash
  sudo lsof -i :3000
  ```
  If an orphaned Node process is running, kill it (`kill -9 <PID>`) and run `pm2 restart biometrik-workspace`.

---

## 📄 License & Attribution

Copyright © 2026 **Biometrik® Systems**. All rights reserved.  
Proprietary software for internal enterprise operations and client project delivery.
