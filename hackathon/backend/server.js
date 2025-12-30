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
    const wardName = wardMapping[wardId];

    console.log(`\n[DEBUG] Incoming Request for Ward ID: ${wardId}`);
    console.log(`[DEBUG] Mapped Ward Name: ${wardName || "NOT FOUND"}`);

    if (!wardName) {
      return res
        .status(404)
        .json({ success: false, message: "Ward number not found" });
    }

    /* --- ADDITION: CHECK STORAGE --- */
    const cachedData = geminiCache.get(wardId);
    console.log(`[DEBUG] Cache keys:`, geminiCache.keys());

    if (cachedData) {
      console.log(`[DEBUG] Cache HIT for wardId ${wardId}`);
      console.log(`[DEBUG] Serving from storage: ${wardName}`);
      return res.json(cachedData);
    }
    /* ------------------------------- */

    const { WAQI_TOKEN, OPENWEATHER_KEY, GEMINI_KEY } = process.env;

    try {
/* -------- Step A: KML Geometry Lookup -------- */
        let lat, lon; // Define these OUTSIDE so Step B can see them
        let officialWardName = wardMapping[wardId] || "Unknown Ward";

        try {
            console.log(`[DEBUG] 🗺️ Finding coordinates in KML for Ward ID: ${wardId}`);
            
            // Safe property matching (handles numbers vs strings)
            const feature = wardsGeo.features.find(f => {
                const p = f.properties;
                return String(p.Ward_No) === String(wardId) || 
                       String(p.WNo_SEC) === String(wardId) ||
                       String(p.FID) === String(wardId);
            });

            if (!feature) {
                console.error(`[DEBUG] Ward ${wardId} NOT found in KML properties`);
                return res.status(404).json({ success: false, message: "Ward geometry not found" });
            }

            // Correctly extract coordinates from Turf centroid
            const centroid = turf.centroid(feature);
            lon = centroid.geometry.coordinates[0];
            lat = centroid.geometry.coordinates[1];
            
            officialWardName = feature.properties.WardName || officialWardName;
            console.log(`[DEBUG] 📍 Centroid Found: ${lat}, ${lon} for ${officialWardName}`);

        } catch (kmlErr) {
            console.error("❌ KML Processing Error:", kmlErr.message);
            return res.status(500).json({ success: false, message: "Geometry error" });
        }

        /* -------- Step B: Parallel Fetch -------- */
        // Now lat and lon ARE defined here
        console.log(`[DEBUG] Starting Parallel Fetch for: ${officialWardName}`);
        const now = Math.floor(Date.now() / 1000);
        const yesterday = now - 86400;

        const [waqiRes, owmRes, historyRes, forecastRes] = await Promise.allSettled([
            axiosInstance.get(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${WAQI_TOKEN}`),
            axiosInstance.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`),
            axiosInstance.get(`https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${yesterday}&end=${now}&appid=${OPENWEATHER_KEY}`),
            axiosInstance.get(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`)
        ]);

      const waqiData =
        waqiRes.status === "fulfilled" && waqiRes.value.data.status === "ok"
          ? waqiRes.value.data.data
          : null;

      // ✅ SAFE access (no crash if list empty)
      const owmPollutants =
        owmRes.status === "fulfilled" && owmRes.value.data.list?.length
          ? owmRes.value.data.list[0].components
          : null;

      const finalAQI =
        waqiData?.aqi || calculateIndianAQI(owmPollutants?.pm2_5);

      const historyData =
        historyRes.status === "fulfilled"
          ? historyRes.value.data.list.slice(-24)
          : [];

      const forecastData =
        forecastRes.status === "fulfilled"
          ? forecastRes.value.data.list.slice(0, 24)
          : [];

      /* -------- STEP C: AI ANALYSIS (UNCHANGED PROMPT) -------- */
      let aiOutput;
      console.log(`\n--- [DEBUG] PRE-GEMINI DATA CHECK ---`);
      console.log(`Ward: ${wardName}`);
      console.log(`AQI: ${finalAQI}`);
      console.log(`Pollutants: PM2.5: ${owmPollutants?.pm2_5}`);
      console.log(`-------------------------------------\n`);
      try {
        console.log(`[DEBUG] Gemini call started for ${wardName}`);

        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemma-3-12b",
          // ADD THIS PART TO STOP THE BLANK RESPONSES:
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH", // Allows more "edgy" or accidental text
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH",
            },
          ],
        });

        const prompt = `
        Role: Senior Environmental Data Scientist.
        Context: Analyzing Ward: ${wardName}, Delhi. Current AQI: ${finalAQI}. 
        Pollutants: PM2.5: ${owmPollutants?.pm2_5}, PM10: ${
          owmPollutants?.pm10
        }, NO2: ${owmPollutants?.no2}.

        Task: Return a VALID JSON object (no markdown) with this structure:
        {
          "cigarettes_count": ${(finalAQI / 22).toFixed(1)},
          "source_breakdown": [
            {
              "source": "e.g., Vehicular Traffic",
              "contribution_percent": 45,
              "major_pollutant": "NO2 and PM2.5",
              "actionable_mitigation": "Specify a local action for ${wardName}",
              "impact_if_removed": "-15% AQI reduction"
            }
          ],
          "impact_summary": "If all primary local sources are mitigated, estimated AQI would drop to approx ${Math.round(
            finalAQI * 0.6
          )}."
        }

        Rules:
        1. Base source percentages on Delhi's seasonal patterns and the ward's local characteristics.
        2. Ensure percentages total 100%.
        `;

        const result = await model.generateContent(prompt);
        console.log(
          "Finish Reason:",
          result.response.candidates[0].finishReason
        );
        const raw = result.response.text();

        console.log(`[DEBUG] Gemini raw response (first 200 chars):`);
        console.log(raw.slice(0, 200));

        // 🛡️ ultra-safe JSON extraction (no logic change)
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON object found in Gemini response");

        aiOutput = JSON.parse(match[0]);

        console.log(`[DEBUG] Gemini JSON parsed successfully`);
      } catch (e) {
        console.error("AI Error:", e.message);
        aiOutput = { error: "AI simulation unavailable. Basic data sent." };
      }

      console.log(`\n✨ --- GEMINI ANALYSIS FOR: ${wardName} ---`);
      console.log(JSON.stringify(aiOutput, null, 2));
      console.log(`-------------------------------------------\n`);

      /* -------- STEP D: RESPONSE -------- */
      const finalResult = {
        success: true,
        ward: wardName,
        ward_id: wardId,
        current_aqi: finalAQI,
        raw_pollutants: owmPollutants,
        history_24h: historyData.map((d) => ({
          time: d.dt,
          aqi: calculateIndianAQI(d.components.pm2_5),
        })),
        forecast_24h: forecastData.map((d) => ({
          time: d.dt,
          aqi: calculateIndianAQI(d.components.pm2_5),
        })),
        analysis: aiOutput,
      };

      /* --- ADDITION: SAVE TO STORAGE (LIMIT 5, EXPIRE 2MIN) --- */
      const keys = geminiCache.keys();
      if (keys.length >= 5) {
        geminiCache.del(keys[0]); // Remove oldest if we hit 5
      }
      geminiCache.set(wardId, finalResult);
      /* ------------------------------------------------------- */

      res.json(finalResult);
    } catch (outerError) {
      console.error("Critical Route Error:", outerError);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
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

/* -------------------- 5. START SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Local Server running: http://localhost:${PORT}`);
  console.log(`📡 Run 'npx ngrok http 5000' in another terminal`);
});
