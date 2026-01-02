# AQI Monitor Backend - MongoDB Setup Guide

## 📋 Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [MongoDB Connection Setup](#mongodb-connection-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [Admin User Management](#admin-user-management)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This is the backend server for the AQI Monitor System. It provides:
- User authentication with JWT tokens
- MongoDB database integration
- Government employee portal APIs
- Ward AQI data management
- Complaint submission system
- Role-based access control (Admin, Govt, Employee, Viewer)

**Tech Stack:**
- Node.js + Express.js
- MongoDB (with Mongoose ODM)
- JWT Authentication
- Bcrypt password hashing

---

## ✅ Prerequisites

Before you begin, make sure you have:
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas account** (cloud) OR **MongoDB installed locally**

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variables

### Step 2: Verify Installation

```bash
npm list
```

You should see all dependencies listed without errors.

---

## 🔌 MongoDB Connection Setup

You have two options for MongoDB:

### Option A: MongoDB Atlas (Cloud - Recommended) ☁️

#### 1. Get Connection String from Team Member

Ask your team member who created the MongoDB Atlas cluster to provide:
- MongoDB connection string
- Database username
- Database password

The connection string looks like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aqi-monitor?retryWrites=true&w=majority
```

#### 2. Verify Network Access

Your team member needs to:
- Go to MongoDB Atlas Dashboard
- Click **Network Access** (left sidebar)
- Click **Add IP Address**
- Choose **"Allow Access from Anywhere"** (for development)
- Click **Confirm**

#### 3. Verify Database User Permissions

- Go to **Database Access** (left sidebar)
- Ensure the database user has **"Read and write to any database"** permission
- If not, click the user → **Edit** → Set permissions → **Save**

#### 4. Update `.env` File

Create/update `.env` file in the backend folder:

```env
# MongoDB Atlas Connection (CLOUD)
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aqi-monitor?retryWrites=true&w=majority

JWT_SECRET=your_hackathon_secret_key_123
PORT=5000
NODE_ENV=development
```

**Important:** Replace `username`, `password`, and cluster URL with your actual values!

---

### Option B: Local MongoDB Installation 💻

#### 1. Install MongoDB

**Windows:**
- Download from: https://www.mongodb.com/try/download/community
- Run installer → Choose "Complete" → Install as a Service
- MongoDB starts automatically

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### 2. Verify MongoDB is Running

```bash
# Check if MongoDB is running
mongosh

# You should see:
# Connecting to: mongodb://127.0.0.1:27017
# test>

# Type 'exit' to quit
```

#### 3. Update `.env` File

```env
# Local MongoDB Connection
MONGO_URI=mongodb://localhost:27017/aqi-monitor

JWT_SECRET=your_hackathon_secret_key_123
PORT=5000
NODE_ENV=development
```

---

## ⚙️ Environment Configuration

### Create `.env` File

In the `backend` folder, create a file named `.env`:

**For MongoDB Atlas (Cloud):**
```env
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aqi-monitor?retryWrites=true&w=majority
JWT_SECRET=your_hackathon_secret_key_123
PORT=5000
NODE_ENV=development
```

**For Local MongoDB:**
```env
MONGO_URI=mongodb://localhost:27017/aqi-monitor
JWT_SECRET=your_hackathon_secret_key_123
PORT=5000
NODE_ENV=development
```

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/aqi-monitor` |
| `JWT_SECRET` | Secret key for JWT tokens (change in production!) | `your_hackathon_secret_key_123` |
| `PORT` | Server port number | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |

---

## 🚀 Running the Server

### Start the Server

```bash
npm start
```

### Start with Auto-Reload (Development)

```bash
npm run dev
```

### Expected Output

```
✅ MongoDB Connected Successfully
👤 Demo Govt User Created: admin@delhi.gov.in / govt123
🚀 Server active on http://localhost:5000
📊 Environment: development
```

### Verify Server is Running

Open your browser and go to:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "OK",
  "message": "AQI Monitor API is running",
  "database": "Connected",
  "timestamp": "2024-12-28T..."
}
```

---

## 👤 Admin User Management

### Automatic Demo User Creation

The server automatically creates a demo government user on first startup:

**Credentials:**
- Email: `admin@delhi.gov.in`
- Password: `govt123`
- Role: `govt`

This user is created automatically when the server connects to MongoDB for the first time.

---

### Using `create-admin.js` Script

The `create-admin.js` script allows you to manually create additional admin users.

#### What Does `create-admin.js` Do?

This utility script:
1. Connects to your MongoDB database
2. Checks if an admin user already exists
3. Creates a new admin user with government role
4. Hashes the password securely using bcrypt
5. Provides you with the login credentials

#### How to Use It

**Step 1: Edit the Script (Optional)**

Open `create-admin.js` and modify the admin credentials if needed:

```javascript
// Admin details (around line 48)
const adminEmail = 'admin@gov.in';      // Change this
const adminPassword = 'admin123';        // Change this
```

**Step 2: Run the Script**

```bash
npm run create-admin
```

OR

```bash
node create-admin.js
```

**Step 3: View Output**

**If admin doesn't exist:**
```
✅ Connected to MongoDB
✅ Admin user created successfully!
Email: admin@gov.in
Password: admin123
⚠️  Please change the password after first login!
```

**If admin already exists:**
```
✅ Connected to MongoDB
⚠️  Admin user already exists!
Email: admin@delhi.gov.in
Role: govt
```

#### When to Use `create-admin.js`

Use this script when you need to:
- Create a new admin user with a specific email
- Reset admin credentials
- Set up multiple admin accounts for your team
- Create admin users with different email domains

#### Script Features

- ✅ **Duplicate Prevention**: Won't create duplicate users
- ✅ **Password Security**: Automatically hashes passwords with bcrypt
- ✅ **Database Connection**: Handles MongoDB connection automatically
- ✅ **Error Handling**: Shows clear error messages if something goes wrong
- ✅ **Environment Variables**: Uses `.env` configuration

#### Customizing Admin Details

Edit these lines in `create-admin.js`:

```javascript
// Line 48-49
const adminEmail = 'yourname@gov.in';    // Your custom email
const adminPassword = 'YourSecurePass123!';  // Your custom password

// The script will:
// - Validate email ends with @gov.in
// - Hash the password automatically
// - Set role to 'admin'
// - Mark account as active
```

#### Testing the Admin Login

After creating the admin user:

**Method 1: Using curl**
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gov.in","password":"admin123"}'
```

**Method 2: Using Postman**
```
POST http://localhost:5000/api/login
Body (JSON):
{
  "email": "admin@gov.in",
  "password": "admin123"
}
```

**Method 3: Using Frontend**
1. Open your React app
2. Go to login page
3. Enter admin credentials
4. Click "Login"

You should receive a JWT token in response!

---

## 📡 API Endpoints

### Authentication Endpoints

#### 1. Login
```http
POST /api/login
Content-Type: application/json

Request Body:
{
  "email": "admin@delhi.gov.in",
  "password": "govt123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "govt",
  "userId": "60d5ec49f1b2c72b8c8e4f1a",
  "email": "admin@delhi.gov.in",
  "redirect": "/govt-dashboard"
}
```

#### 2. Start Signup
```http
POST /api/signup/start
Content-Type: application/json

Request Body:
{
  "email": "newemployee@gov.in"
}

Response:
{
  "success": true,
  "message": "Email verified. Please create your password.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Complete Signup
```http
POST /api/signup/complete
Content-Type: application/json

Request Body:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "60d5ec49f1b2c72b8c8e4f1b",
  "role": "employee",
  "email": "newemployee@gov.in"
}
```

#### 4. Get User Profile
```http
GET /api/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "email": "admin@delhi.gov.in",
    "role": "govt",
    "isActive": true,
    "createdAt": "2024-12-28T10:00:00.000Z",
    "lastLogin": "2024-12-28T12:30:00.000Z"
  }
}
```

### Ward Data Endpoints

#### Get Ward AQI Data
```http
GET /api/ward/:name

Example: GET /api/ward/Connaught%20Place

Response:
{
  "ward": "Connaught Place",
  "aqi": 287,
  "cigarettes": 13,
  "trend": "Rising",
  "recommendation": "Wear a mask",
  "timestamp": "2024-12-28T12:30:00.000Z"
}
```

### Complaint Endpoints

#### Submit Complaint (Public)
```http
POST /api/submit-complaint
Content-Type: application/json

Request Body:
{
  "ward": "Connaught Place",
  "message": "High pollution levels observed near main market"
}

Response:
{
  "success": true,
  "message": "Complaint submitted successfully!",
  "complaintId": "60d5ec49f1b2c72b8c8e4f1c"
}
```

#### Get All Complaints (Govt Only)
```http
GET /api/govt/complaints
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "ward": "Connaught Place",
      "message": "High pollution levels observed",
      "status": "pending",
      "date": "2024-12-28T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Update Complaint Status (Govt Only)
```http
PATCH /api/govt/complaints/:id
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "status": "resolved"
}

Response:
{
  "success": true,
  "message": "Complaint status updated",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1c",
    "status": "resolved",
    ...
  }
}
```

### Admin Endpoints

#### Get All Users (Admin/Govt Only)
```http
GET /api/admin/users
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "email": "admin@delhi.gov.in",
      "role": "govt",
      "isActive": true,
      "createdAt": "2024-12-28T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Update User Role (Admin/Govt Only)
```http
PATCH /api/admin/users/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "role": "admin"
}

Response:
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1b",
    "email": "user@gov.in",
    "role": "admin",
    ...
  }
}
```

---

## 🐛 Troubleshooting

### Issue 1: "Cannot connect to MongoDB"

**Symptoms:**
```
❌ DB Connection Error: MongooseServerSelectionError
```

**Solutions:**

1. **Check if MongoDB is running:**
   ```bash
   # For local MongoDB
   mongosh
   
   # For Atlas - verify connection string
   ```

2. **Verify connection string in `.env`:**
   - No typos in username/password
   - Correct cluster URL
   - Password URL-encoded (replace special characters)

3. **For Atlas - Check Network Access:**
   - Go to MongoDB Atlas → Network Access
   - Ensure your IP is whitelisted OR "Allow from Anywhere" is enabled

4. **For Local MongoDB - Start the service:**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

### Issue 2: "Port 5000 already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**

1. **Find and kill the process:**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -i :5000
   kill -9 <PID>
   ```

2. **Or change the port in `.env`:**
   ```env
   PORT=5001
   ```

### Issue 3: "Module not found" errors

**Symptoms:**
```
Error: Cannot find module 'mongoose'
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: "Invalid token" errors

**Causes:**
- Expired JWT token (tokens expire after 24 hours)
- Wrong JWT_SECRET in `.env`
- Token not sent in Authorization header

**Solution:**
1. Login again to get a fresh token
2. Ensure JWT_SECRET matches across all environments
3. Send token in header: `Authorization: Bearer <token>`

### Issue 5: "Demo user already exists"

**This is normal!** The demo user is created once on first run. You can:
- Use the existing credentials: `admin@delhi.gov.in` / `govt123`
- Or create a new admin using `npm run create-admin`

### Issue 6: Password validation errors

**Symptoms:**
```
Password must be at least 6 characters long
```

**Solution:**
- Minimum 6 characters required
- For strong passwords (recommended):
  - At least 8 characters
  - One uppercase letter
  - One lowercase letter
  - One number
  - One special character

### Issue 7: CORS errors in frontend

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Solution:**
The backend already has CORS enabled for all origins. If still getting errors:

1. Check frontend is making requests to correct URL
2. Verify backend is running
3. Check browser console for exact error

---

## 🔒 Security Best Practices

### For Production:

1. **Change JWT_SECRET:**
   ```env
   JWT_SECRET=use-a-very-long-random-string-here-at-least-32-chars
   ```
   Generate a secure secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use strong passwords:**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols
   - Change default passwords immediately

3. **Restrict CORS:**
   In `server.js`, replace:
   ```javascript
   app.use(cors({ origin: "*" }));
   ```
   With:
   ```javascript
   app.use(cors({ 
     origin: "https://your-frontend-domain.com",
     credentials: true 
   }));
   ```

4. **Enable HTTPS:**
   - Use SSL certificates
   - Deploy behind a reverse proxy (nginx)

5. **Rate Limiting:**
   Add rate limiting to prevent abuse:
   ```bash
   npm install express-rate-limit
   ```

6. **Environment Variables:**
   - Never commit `.env` to git
   - Use different secrets for dev/prod
   - Store production secrets securely (AWS Secrets Manager, etc.)

---

## 📚 Database Schema

### User Schema
```javascript
{
  email: String,           // Must end with @gov.in, unique
  password: String,        // Hashed with bcrypt
  role: String,           // 'admin', 'govt', 'employee', 'viewer'
  isActive: Boolean,      // Account status
  createdAt: Date,        // Auto-generated
  lastLogin: Date         // Updated on each login
}
```

### Complaint Schema
```javascript
{
  ward: String,           // Ward name
  message: String,        // Complaint description
  status: String,         // 'pending', 'in-progress', 'resolved'
  date: Date             // Auto-generated
}
```

---

## 🤝 Team Collaboration

### Sharing MongoDB Access

**Team Member with Atlas Cluster:**
1. Go to MongoDB Atlas Dashboard
2. Database → Connect → Connect your application
3. Copy connection string
4. Share with team:
   - Connection string (with password)
   - Database name
   - Confirm network access is set to "Allow from Anywhere"

**Team Member Receiving Access:**
1. Update `.env` with provided connection string
2. Test connection: `npm start`
3. Verify: `curl http://localhost:5000/api/health`

### Git Best Practices

**Files to commit:**
- ✅ `server.js`
- ✅ `package.json`
- ✅ `.env.example` (template without secrets)
- ✅ `create-admin.js`
- ✅ `README.md`

**Files to NEVER commit:**
- ❌ `.env` (contains secrets!)
- ❌ `node_modules/`
- ❌ Any files with passwords or tokens

**`.gitignore` should include:**
```
node_modules/
.env
.env.local
.env.production
*.log
```

---

## 📞 Support

### Common Commands Reference

```bash
# Install dependencies
npm install

# Start server
npm start

# Start with auto-reload
npm run dev

# Create admin user
npm run create-admin

# Check MongoDB connection
mongosh

# View logs
npm start > server.log 2>&1
```

### Useful MongoDB Commands

```bash
# Connect to local MongoDB
mongosh

# Show databases
show dbs

# Use AQI database
use aqi-monitor

# Show collections
show collections

# View users
db.users.find()

# View complaints
db.complaints.find()

# Count documents
db.users.countDocuments()

# Delete all users (careful!)
db.users.deleteMany({})
```

---

## ✅ Final Checklist

Before running in production:

- [ ] `.env` file created with correct MongoDB URI
- [ ] JWT_SECRET changed from default
- [ ] MongoDB connection successful
- [ ] Demo user created and tested
- [ ] All API endpoints tested
- [ ] CORS configured for production domain
- [ ] Passwords are strong and changed from defaults
- [ ] `.env` added to `.gitignore`
- [ ] Team members have access to MongoDB
- [ ] Health endpoint returns "Connected"

---

## 📄 License

MIT

---

## 👥 Contributors

Akshay V R 
Trishank
Tanveer Singh Channa
Rishik Majumdar
Shreyans Mohanty


---

**Need help?** Check the troubleshooting section or contact your team lead.

**Last Updated:** December 28, 2024