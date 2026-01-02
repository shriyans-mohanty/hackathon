require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// --- CONFIGURATION ---
const JWT_SECRET = process.env.JWT_SECRET || "your_hackathon_secret_key_123";
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aqi-monitor';
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors({ 
    origin: "*", 
    allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning", "authorization"] 
}));

// --- DATABASE CONNECTION ---
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
    console.log("✅ MongoDB Connected Successfully");
    createDemoUser();
})
.catch(err => console.log("❌ DB Connection Error:", err));

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v.endsWith('@gov.in');
      },
      message: 'Email must be a valid government email (@gov.in)'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'govt', 'employee', 'viewer'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// --- COMPLAINT SCHEMA ---
const complaintSchema = new mongoose.Schema({
    ward: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

// --- CREATE DEMO USER ---
async function createDemoUser() {
    try {
        const demoEmail = "admin@delhi.gov.in";
        const demoPass = "govt123";
        
        const exists = await User.findOne({ email: demoEmail });
        if (!exists) {
            const user = new User({ 
                email: demoEmail, 
                password: demoPass, 
                role: "govt" 
            });
            await user.save();
            console.log(`👤 Demo Govt User Created: ${demoEmail} / ${demoPass}`);
        } else {
            console.log("ℹ️ Demo Govt User already exists.");
        }
    } catch (err) {
        console.log("Error seeding user:", err);
    }
}

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// --- GOVT ROUTE PROTECTION ---
const protectGovtRoute = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'govt' && decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Not a Govt account" });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// --- API ENDPOINTS ---

// Home route
app.get('/', (req, res) => {
    res.send(`
        <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
            <h1 style="color:#4CAF50;">✅ AQI Monitor Gateway Online</h1>
            <p>The backend is successfully running with MongoDB.</p>
            <p>Current Server Time: ${new Date().toLocaleTimeString()}</p>
        </div>
    `);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AQI Monitor API is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTHENTICATION ROUTES ====================

// 1. LOGIN ROUTE
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact admin.' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            role: user.role,
            userId: user._id,
            email: user.email,
            redirect: user.role === 'govt' || user.role === 'admin' ? '/govt-dashboard' : '/'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// 2. START SIGNUP PROCESS
app.post('/api/signup/start', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        if (!email.endsWith('@gov.in')) {
            return res.status(400).json({ success: false, message: 'Please use a valid government email (@gov.in)' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email already exists' });
        }

        // Generate temporary token for password creation
        const tempToken = jwt.sign(
            { email: email.toLowerCase(), purpose: 'signup' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            message: 'Email verified. Please create your password.',
            token: tempToken
        });

    } catch (error) {
        console.error('Signup start error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
});

// 3. COMPLETE SIGNUP (Create Password)
app.post('/api/signup/complete', async (req, res) => {
    try {
        const { token, password } = req.body;

        // Validate input
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }

        if (decoded.purpose !== 'signup') {
            return res.status(401).json({ success: false, message: 'Invalid token type' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: decoded.email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }

        // Create new user
        const newUser = new User({
            email: decoded.email,
            password: password,
            role: 'employee'
        });

        await newUser.save();

        // Generate login token
        const loginToken = jwt.sign(
            { 
                userId: newUser._id, 
                email: newUser.email, 
                role: newUser.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token: loginToken,
            userId: newUser._id,
            role: newUser.role,
            email: newUser.email
        });

    } catch (error) {
        console.error('Signup complete error:', error);
        res.status(500).json({ success: false, message: 'Server error during account creation' });
    }
});

// 4. GET USER PROFILE
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== WARD DATA ROUTES ====================

// PUBLIC WARD DATA
app.get('/api/ward/:name', (req, res) => {
    const wardName = req.params.name;
    const aqi = Math.floor(Math.random() * (450 - 150) + 150); 
    res.json({
        ward: wardName,
        aqi: aqi,
        cigarettes: Math.floor(aqi / 22),
        trend: "Rising",
        recommendation: aqi > 300 ? "Avoid outdoor activities" : "Wear a mask",
        timestamp: new Date().toISOString()
    });
});

// ==================== COMPLAINT ROUTES ====================

// SUBMIT COMPLAINT (Public)
app.post('/api/submit-complaint', async (req, res) => {
    try {
        const { ward, message } = req.body;

        if (!ward || !message) {
            return res.status(400).json({ success: false, message: 'Ward and message are required' });
        }

        const complaint = await Complaint.create({ ward, message });
        res.json({ 
            success: true, 
            message: 'Complaint submitted successfully!',
            complaintId: complaint._id
        });
    } catch (err) {
        console.error('Complaint submission error:', err);
        res.status(500).json({ success: false, message: 'Failed to submit complaint' });
    }
});

// GET ALL COMPLAINTS (Protected - Govt only)
app.get('/api/govt/complaints', protectGovtRoute, async (req, res) => {
    try {
        const complaints = await Complaint.find().sort({ date: -1 });
        res.json({ 
            success: true, 
            data: complaints,
            count: complaints.length
        });
    } catch (err) {
        console.error('Fetch complaints error:', err);
        res.status(500).json({ success: false, message: 'Could not fetch complaints' });
    }
});

// UPDATE COMPLAINT STATUS (Protected - Govt only)
app.patch('/api/govt/complaints/:id', protectGovtRoute, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        res.json({ 
            success: true, 
            message: 'Complaint status updated',
            data: complaint
        });
    } catch (err) {
        console.error('Update complaint error:', err);
        res.status(500).json({ success: false, message: 'Failed to update complaint' });
    }
});

// ==================== ADMIN ROUTES ====================

// GET ALL USERS (Admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        // Check if requester is admin
        if (req.user.role !== 'admin' && req.user.role !== 'govt') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users, count: users.length });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// UPDATE USER ROLE (Admin only)
app.patch('/api/admin/users/:userId/role', authenticateToken, async (req, res) => {
    try {
        // Check if requester is admin
        if (req.user.role !== 'admin' && req.user.role !== 'govt') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const { role } = req.body;
        const { userId } = req.params;

        if (!['admin', 'govt', 'employee', 'viewer'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'Role updated successfully', data: user });
    } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
    console.log(`🚀 Server active on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;