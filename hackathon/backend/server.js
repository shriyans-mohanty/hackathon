require("dotenv").config();
//kml
const fs = require("fs");
const { JSDOM } = require("jsdom");
const toGeoJSON = require("@tmcw/togeojson");
const turf = require("@turf/turf");

const express = require("express");
const axios = require("axios");
const axiosInstance = axios.create({
  timeout: 8000, // 8 seconds max
});
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const ngrok = require("@ngrok/ngrok");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { param, validationResult } = require("express-validator");
const { GoogleGenerativeAI } = require("@google/generative-ai");
// Load KML once at startup
let wardsGeo = null;
try {
  const kmlContent = fs.readFileSync(
    path.join(__dirname, "delhi_wards.kml"),
    "utf8"
  );
  const dom = new JSDOM(kmlContent, { contentType: "text/xml" });
  wardsGeo = toGeoJSON.kml(dom.window.document);
  console.log("✅ KML Ward Data Loaded Successfully");
} catch (err) {
  console.error("❌ KML Loading Error:", err.message);
}

/* --- ADDITION: CACHE CONFIG --- */
const NodeCache = require("node-cache");
const geminiCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });
/* ------------------------------ */

const wardMapping = require("./wardData");

const app = express();

// login initial
const JWT_SECRET = process.env.JWT_SECRET || "your_hackathon_secret_key_123";
app.use(express.json());
app.use(
  cors({
    origin: "*",
    allowedHeaders: [
      "Content-Type",
      "ngrok-skip-browser-warning",
      "authorization",
    ],
  })
);

app.set("trust proxy", 1);
app.use(express.json()); // ✅ kept only once
app.use(cors());
app.use(express.static("public"));

/* -------------------- 1. DATABASE SETUP -------------------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("📦 MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

const SearchLog = mongoose.model(
  "SearchLog",
  new mongoose.Schema({
    wardName: String,
    aqi: Number,
    status: String,
    timestamp: { type: Date, default: Date.now },
  })
);
const WardAnalysisStorage = mongoose.model(
  "WardAnalysisStorage",
  new mongoose.Schema({
    wardId: { type: String, required: true, unique: true },
    aiOutput: Object, // The Gemini JSON
    lastUpdated: { type: Date, default: Date.now },
  })
);
const Ward = mongoose.model(
  "Ward",
  new mongoose.Schema({
    wardId: { type: String, required: true, unique: true },
    wardName: String,
    aqi: Number,
    pollutants: Object,
    lastUpdated: { type: Date, default: Date.now },
  })
);
// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return v.endsWith("@gov.in");
      },
      message: "Email must be a valid government email (@gov.in)",
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["admin", "govt", "employee", "viewer"],
    default: "employee",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
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
        role: "govt",
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
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// --- GOVT ROUTE PROTECTION ---
const protectGovtRoute = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "govt" && decoded.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Govt account" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
// ==================== AUTHENTICATION ROUTES ====================

// 1. LOGIN ROUTE
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Account is deactivated. Please contact admin.",
        });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token: token,
      role: user.role,
      userId: user._id,
      email: user.email,
      redirect:
        user.role === "govt" || user.role === "admin" ? "/govt-dashboard" : "/",
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
});

// 2. START SIGNUP PROCESS
app.post("/api/signup/start", async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    if (!email.endsWith("@gov.in")) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please use a valid government email (@gov.in)",
        });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(409)
        .json({
          success: false,
          message: "User with this email already exists",
        });
    }

    // Generate temporary token for password creation
    const tempToken = jwt.sign(
      { email: email.toLowerCase(), purpose: "signup" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Email verified. Please create your password.",
      token: tempToken,
    });
  } catch (error) {
    console.error("Signup start error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during signup" });
  }
});

// 3. COMPLETE SIGNUP (Create Password)
app.post("/api/signup/complete", async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    if (decoded.purpose !== "signup") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token type" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: decoded.email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // Create new user
    const newUser = new User({
      email: decoded.email,
      password: password,
      role: "employee",
    });

    await newUser.save();

    // Generate login token
    const loginToken = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: loginToken,
      userId: newUser._id,
      role: newUser.role,
      email: newUser.email,
    });
  } catch (error) {
    console.error("Signup complete error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error during account creation",
      });
  }
});

// 4. GET USER PROFILE
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------- 2. RATE LIMITER -------------------- */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests from this IP." },
});

/* -------------------- 3. AQI LOGIC -------------------- */
const calculateIndianAQI = (pm25) => {
  if (pm25 == null || pm25 < 0) return null;
  if (pm25 <= 30) return Math.round((pm25 * 50) / 30);
  if (pm25 <= 60) return Math.round(50 + ((pm25 - 30) * 50) / 30);
  if (pm25 <= 90) return Math.round(100 + ((pm25 - 60) * 100) / 30);
  if (pm25 <= 120) return Math.round(200 + ((pm25 - 90) * 100) / 30);
  if (pm25 <= 250) return Math.round(300 + ((pm25 - 120) * 100) / 130);
  return Math.round(400 + (pm25 - 250));
};
//Ward dividing w time:
const cron = require('node-cron');

// 12:00 AM IST (Wards 1-63)
cron.schedule('0 0 * * *', () => updateWardSegment(0, 63), {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// 06:00 AM IST (Wards 64-126)
cron.schedule('0 6 * * *', () => updateWardSegment(63, 63), {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// 12:00 PM IST (Wards 127-189)
cron.schedule('0 12 * * *', () => updateWardSegment(126, 63), {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// 06:00 PM IST (Wards 190-250)
cron.schedule('42 18 * * *', () => updateWardSegment(189, 61), {
  scheduled: true,
  timezone: "Asia/Kolkata"
});
//gemini prompt
async function generateAiAnalysis(wardName, finalAQI, pollutants, key) {
  try {
    const istDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
    }).format(new Date());
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Updated to a stable high-performance model
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      ]
    });

   const prompt = `Role: Senior Environmental Data Scientist & Urban Policy Architect.
Context: Ward: ${wardName}, Delhi. Current AQI: ${finalAQI}. Pollutant Levels: ${JSON.stringify(pollutants)}.
Current Delhi Date: ${istDate}.

Task: Generate a high-fidelity, descriptive analysis of air quality sources and multi-dimensional policy impacts. 
Ground all suggestions in Delhi's specific socio-economic fabric.

Return ONLY a VALID JSON object with this exact structure:
{
  "source_breakdown": [
    {
      "source": "Specific sector (e.g., 'Construction & Demolition Dust')",
      "contribution_percent": 0, 
      "major_pollutant": "PM10",
      "impact_if_removed": "Predicted AQI reduction (e.g., '-40 AQI points')",
      "citizen_mitigation": "Descriptive ward-specific community actions. Focus on local activism and behavioral changes.",
      "govt_mitigation": "Descriptive technical/legal enforcement actions specific to ${wardName}'s infrastructure."
    }
  ],
  "impact_summary": "A 3-sentence descriptive summary of immediate health risks for vulnerable groups in ${wardName}.",
  "active_policies": "A detailed summary of all pollution policies active in Delhi as of ${istDate}. Specifically list the active GRAP Stage and summarize the 3 most impactful restrictions.",
  "policy_recommendations": [
    {
      "policy_name": "E.g., Low Emission Zones (LEZ) in Commercial Hubs",
      "description": "Deeply descriptive legislative proposal (3-4 sentences) outlining the mandate, enforcement mechanism, and specific target areas.",
      "estimated_effects": {
        "pollution": "Estimated % reduction in ward-level pollutants.",
        "socio_economic": "Detailed analysis of how this affects citizens' lives (e.g., 'Will reduce commute times by 15%', 'Could increase retail footfall due to better walkability', 'May require transition subsidies for small-scale transport workers').",
        "workforce_productivity": "Estimation of how health improvements translate to reduced sick leaves or increased outdoor working hours for laborers."
      }
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const match = raw.match(/\{[\s\S]*\}/);
    
    if (match) {
        const parsedData = JSON.parse(match[0]);
        // Note: You may need to update your UI display function to handle the new keys:
        // parsedData.citizen_mitigation, parsedData.govt_mitigation, and parsedData.policy_recommendations
        return parsedData;
    } else {
        return { error: "Parse Error" };
    }
  } catch (e) {
    console.error("Gemini Function Error:", e.message);
    return { error: "AI temporarily unavailable" };
  }
}
//BULK MODE:
async function updateWardSegment(startIndex, limitCount) {
  try {
    const key = process.env.GEMINI_KEY;
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 1. Force IST Date (Independent of server location)
    const istDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
    }).format(new Date());

    // 2. Fetch the specific segment of wards from MongoDB
    // Use .lean() for faster performance during bulk operations
    const wards = await Ward.find().sort({ wardId: 1 }).skip(startIndex).limit(limitCount).lean();

    const prompt = `Role: Senior Environmental Data Scientist & Urban Policy Architect.
Context: Ward: ${wardName}, Delhi. Current AQI: ${finalAQI}. Pollutant Levels: ${JSON.stringify(pollutants)}.
Current Delhi Date: ${istDate}.

Task: Generate a high-fidelity, descriptive analysis of air quality sources and multi-dimensional policy impacts. 
Ground all suggestions in Delhi's specific socio-economic fabric.

Return ONLY a VALID JSON object with this exact structure:
{
  "source_breakdown": [
    {
      "source": "Specific sector (e.g., 'Construction & Demolition Dust')",
      "contribution_percent": 0, 
      "major_pollutant": "PM10",
      "impact_if_removed": "Predicted AQI reduction (e.g., '-40 AQI points')",
      "citizen_mitigation": "Descriptive ward-specific community actions. Focus on local activism and behavioral changes.",
      "govt_mitigation": "Descriptive technical/legal enforcement actions specific to ${wardName}'s infrastructure."
    }
  ],
  "impact_summary": "A 3-sentence descriptive summary of immediate health risks for vulnerable groups in ${wardName}.",
  "active_policies": "A detailed summary of all pollution policies active in Delhi as of ${istDate}. Specifically list the active GRAP Stage and summarize the 3 most impactful restrictions.",
  "policy_recommendations": [
    {
      "policy_name": "E.g., Low Emission Zones (LEZ) in Commercial Hubs",
      "description": "Deeply descriptive legislative proposal (3-4 sentences) outlining the mandate, enforcement mechanism, and specific target areas.",
      "estimated_effects": {
        "pollution": "Estimated % reduction in ward-level pollutants.",
        "socio_economic": "Detailed analysis of how this affects citizens' lives (e.g., 'Will reduce commute times by 15%', 'Could increase retail footfall due to better walkability', 'May require transition subsidies for small-scale transport workers').",
        "workforce_productivity": "Estimation of how health improvements translate to reduced sick leaves or increased outdoor working hours for laborers."
      }
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const match = raw.match(/\[[\s\S]*\]/);
    const aiResults = match ? JSON.parse(match[0]) : [];

    if (aiResults.length > 0) {
      // 3. THE OVERWRITE MAGIC: Prepare Bulk Operations
      // This will overwrite your "Instant Click" data if it exists, or create it if not.
      const operations = aiResults.map(res => ({
        updateOne: {
          filter: { wardId: res.wardId },
          update: { 
            $set: { 
              aiOutput: res,           // This matches your instant click key
              lastUpdated: new Date()  // Timestamp to track fresh data
            } 
          },
          upsert: true // Creates the record if it doesn't exist
        }
      }));

      // Execute all 62-63 updates in ONE database round-trip
      await WardAnalysisStorage.bulkWrite(operations);
      console.log(`[${istDate}] Successfully updated segment starting at index ${startIndex}`);
    }
  } catch (e) {
    console.error(`Bulk Batch Error at ${startIndex}:`, e.message);
  }
}
/* -------------------- 4. MAIN API ROUTE -------------------- */

app.get(
  "/api/ward-analysis/:id",
  apiLimiter,
  param("id").trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const wardId = req.params.id;
    const { WAQI_TOKEN, OPENWEATHER_KEY, GEMINI_KEY } = process.env;

    try {
      /* -------- Step A: KML Geometry Lookup -------- */
      let lat, lon, officialWardName;
      const feature = wardsGeo.features.find(f => {
        const p = f.properties;
        return String(p.Ward_No) === String(wardId) || 
               String(p.WNo_SEC) === String(wardId) ||
               String(p.FID) === String(wardId);
      });

      if (!feature) {
        return res.status(404).json({ success: false, message: "Ward geometry not found" });
      }

      const centroid = turf.centroid(feature);
      lon = centroid.geometry.coordinates[0];
      lat = centroid.geometry.coordinates[1];
      officialWardName = feature.properties.WardName || wardMapping[wardId] || "Unknown Ward";

      /* -------- Step B: Parallel Fetch (REAL-TIME) -------- */
      const now = Math.floor(Date.now() / 1000);
      const yesterday = now - 86400;

      const [waqiRes, owmRes, historyRes, forecastRes] = await Promise.allSettled([
        axiosInstance.get(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${WAQI_TOKEN}`),
        axiosInstance.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`),
        axiosInstance.get(`https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${yesterday}&end=${now}&appid=${OPENWEATHER_KEY}`),
        axiosInstance.get(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`)
      ]);

      const waqiData = waqiRes.status === "fulfilled" && waqiRes.value.data.status === "ok" ? waqiRes.value.data.data : null;
      const owmPollutants = owmRes.status === "fulfilled" && owmRes.value.data.list?.length ? owmRes.value.data.list[0].components : null;
      const finalAQI = waqiData?.aqi || calculateIndianAQI(owmPollutants?.pm2_5);

/* -------- Step C: AI ANALYSIS (WITH EXPIRED FALLBACK) -------- */
let aiOutput;
const storedAnalysis = await WardAnalysisStorage.findOne({ wardId });

// 1. Check if data is "Fresh" (less than 24 hours old)
const isFresh = storedAnalysis && (Date.now() - storedAnalysis.lastUpdated < 24 * 60 * 60 * 1000);

if (isFresh) {
    console.log(`[DEBUG] Serving Fresh AI Analysis from MongoDB`);
    aiOutput = storedAnalysis.aiOutput;
} else {
    console.log(`[DEBUG] Cache expired/missing. Attempting Gemini call...`);
    try {
        // Attempt to get NEW data
        aiOutput = await generateAiAnalysis(officialWardName, finalAQI, owmPollutants, GEMINI_KEY);
        
        // Check if Gemini actually returned data or an error object
        if (aiOutput && !aiOutput.error) {
            await WardAnalysisStorage.findOneAndUpdate(
                { wardId },
                { aiOutput, lastUpdated: new Date() },
                { upsert: true }
            );
            console.log(`[DEBUG] Success! MongoDB updated with new Gemini data.`);
        } else {
            // If generateAiAnalysis returned an {error: ...} object
            throw new Error("Gemini returned an internal error object");
        }
    } catch (aiError) {
        console.error(`[CRITICAL fallback] Gemini failed: ${aiError.message}`);
        
        if (storedAnalysis) {
            console.log(`[DEBUG] Using EXPIRED data as fallback for ${officialWardName}`);
            aiOutput = storedAnalysis.aiOutput;
            // Optional: Tag the output so frontend knows it's old
            aiOutput.isOfflineData = true; 
        } else {
            // Last resort: If there is NO data in DB at all
            // Change this part in your "catch (aiError)" block:
          aiOutput = { 
    impact_summary: "AI analysis is currently being generated. Please refresh in a few moments.",
    // Matches the new array structure to prevent frontend .map() errors
    source_breakdown: [
        {
            source: "Loading...",
            contribution_percent: 0,
            major_pollutant: "...",
            impact_if_removed: "...",
            citizen_mitigation: "Data pending...",
            govt_mitigation: "Data pending..."
        }
    ],
    active_policies: "Policies are being fetched for " + istDate,
    // Matches the new detailed policy array structure
    policy_recommendations: [
        {
            policy_name: "Loading Recommendation...",
            description: "Detailed analysis is in progress.",
            estimated_effects: {
                pollution: "Calculating...",
                socio_economic: "Analyzing...",
                workforce_productivity: "Estimating..."
            }
        }
    ]
};
        }
    }
}

      /* -------- Step D: FINAL RESPONSE -------- */
      res.json({
        success: true,
        ward: officialWardName,
        ward_id: wardId,
        current_aqi: finalAQI,
        cigarettes_count: (finalAQI / 22).toFixed(1), // Real-time calculation
        raw_pollutants: owmPollutants,
        history_24h: (historyRes.status === "fulfilled" ? historyRes.value.data.list.slice(-24) : []).map(d => ({
          // Convert Unix timestamp (seconds) to a readable 24-hour format string
          time: new Date(d.dt * 1000).toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          }),
          aqi: calculateIndianAQI(d.components?.pm2_5),
        })),
        forecast_24h: (forecastRes.status === "fulfilled" ? forecastRes.value.data.list.slice(0, 24) : []).map(d => ({
  // Convert Unix timestamp (seconds) to a readable 24-hour format string (IST)
  time: new Date(d.dt * 1000).toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }),
  // Calculate the Indian AQI for this forecasted hour based on PM2.5
  aqi: calculateIndianAQI(d.components?.pm2_5),
  // Optionally include raw pollutants for detailed tooltips
  pm2_5: d.components?.pm2_5,
  pm10: d.components?.pm10
})),
        analysis: aiOutput, // Cached AI Insight
      });
      

    } catch (err) {
      console.error("Critical Error:", err.message);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);
//AQI SHOW
app.get("/api/aqi", async (req, res) => {
  try {
    // Bounding box covering Delhi NCR
    console.log(`[DEBUG]Starting Bounding`);
    const response = await axios.get(`https://api.waqi.info/map/bounds/`, {
      params: {
        token: process.env.WAQI_TOKEN,
        latlng: "28.40,76.80,28.90,77.50",
      },
    });
    console.log(`[DEBUG]Finished Bounding`);

    if (response.data.status !== "ok") {
      return res.status(500).json({ error: "WAQI API error" });
    }

    res.json(response.data.data); // <-- ARRAY OF STATIONS
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch AQI" });
  }
});
// --- MARK GRIEVANCE AS RESOLVED ---
app.patch('/api/grievances/:id/resolve', async (req, res) => {
    const { id } = req.params;

    try {
        // Use your Mongoose model here. 
        // { new: true } returns the updated document instead of the old one.
        const updatedGrievance = await Grievance.findByIdAndUpdate(
            id, 
            { status: 'resolved' }, 
            { new: true }
        );

        if (!updatedGrievance) {
            return res.status(404).json({ success: false, message: 'Grievance not found' });
        }

        console.log(`Grievance ${id} marked as resolved`);
        res.json({ 
            success: true, 
            message: 'Status updated to resolved',
            data: updatedGrievance 
        });
    } catch (err) {
        console.error("Grievance Update Error:", err.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
const grievanceSchema = new mongoose.Schema({
  description: { type: String, required: true },
  ward: { type: String },
  ipAddress: { type: String },
  image_url: { type: String },
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  
});
const Grievance = mongoose.model("Grievance", grievanceSchema);
app.get("/api/grievances", async (req, res) => {
  try {
    const items = await Grievance.find().sort({ createdAt: -1 }).lean();
    res.json(
      items.map((g) => ({
        id: g._id.toString(),
        description: g.description || "",
        image_url: g.image_url || null,
        status: g.status || "pending",
      }))
    );
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/grievances/by-ip", async (req, res) => {
  try {
    const ipAddress = (req.query.ipAddress || "").toString().trim();
    console.log(ipAddress)
    if (!ipAddress) return res.json([]);
    const items = await Grievance.find({ ipAddress }).sort({ createdAt: -1 }).lean();
    res.json(
      items.map((g) => ({
        id: g._id.toString(),
        description: g.description || "",
        image_url: g.image_url || null,
        status: g.status || "pending",
      }))
    );
  } catch (e) {
    res.status(500).json([]);
  }
});

app.post("/api/grievances", async (req, res) => {
  try {
    const { description, ward, ipAddress, image_url } = req.body || {};
    if (!description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: "Description required" });
    }
    const doc = await Grievance.create({
      description: String(description).trim(),
      ward: ward || "",
      ipAddress: ipAddress || "",
      image_url: image_url || null,
      status: "pending",
    });
    res.status(201).json({ success: true, id: doc._id.toString() });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.patch("/api/grievances/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    await Grievance.findByIdAndUpdate(id, { $set: { status: "resolved" } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.delete("/api/grievances/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Grievance.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});
//MCD ACTION TRISHANKS
const mcdActionSchema = new mongoose.Schema({
  ward: { type: String, required: true, trim: true },
  action_text: { type: String, required: true, trim: true },
  action_date: { type: Date, required: true },
  doc_url: { type: String },
  status: { type: String, enum: ["posted", "deleted"], default: "posted" },
  createdAt: { type: Date, default: Date.now }
});
const MCDAction = mongoose.model("MCDAction", mcdActionSchema);

app.get("/api/mcd-actions", async (req, res) => {
  try {
    const ward = (req.query.ward || "").toString().trim();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const q = { status: "posted" };
    if (ward) q.ward = ward;
    if (startDate || endDate) {
      q.action_date = {};
      if (startDate) q.action_date.$gte = startDate;
      if (endDate) q.action_date.$lte = endDate;
    }
    const items = await MCDAction.find(q).sort({ action_date: -1, createdAt: -1 }).lean();
    const out = items.map(a => ({
      id: a._id.toString(),
      ward: a.ward,
      action_text: a.action_text,
      action_date: a.action_date,
      doc_url: a.doc_url || null
    }));
    res.json(out);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.post("/api/mcd-actions", async (req, res) => {
  try {
    let { ward, action_text, action_date, doc_url } = req.body || {};
    ward = (ward || "").toString().trim().slice(0, 120).replace(/[<>]/g, "");
    action_text = (action_text || "").toString().trim().slice(0, 2000).replace(/[<>]/g, "");
    doc_url = doc_url ? (doc_url.toString().trim().slice(0, 2000)) : null;
    const dateObj = action_date ? new Date(action_date) : null;
    if (!ward || !action_text || !dateObj || isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }
    console.log("[mcd] POST", { ward, len: action_text.length });
    const doc = await MCDAction.create({
      ward,
      action_text,
      action_date: dateObj,
      doc_url: doc_url || null
    });
    res.status(201).json({ success: true, id: doc._id.toString() });
  } catch (e) {
    console.error("[mcd] POST error", e && e.message || e);
    res.status(500).json({ success: false, error: e && e.message || "server_error" });
  }
});

app.delete("/api/mcd-actions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await MCDAction.findByIdAndUpdate(id, { $set: { status: "deleted" } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});
/* -------------------- 5. START SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Local Server running: http://localhost:${PORT}`);
  console.log(`📡 Run 'npx ngrok http 5000' in another terminal`);
});
