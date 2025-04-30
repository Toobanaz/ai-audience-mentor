import express from "express";
import { CosmosClient } from "@azure/cosmos";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors"; // Import CORS for cross-origin requests
import fetch from "node-fetch"; // Import fetch for ES modules

// Fixes __dirname issue with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS
app.use(express.static(path.join(__dirname, 'dist')));

// =======================
// Cosmos DB Setup (Authentication)
// =======================
const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_URI,
  key: process.env.COSMOS_DB_KEY,
});

// Database and container for user authentication
const databaseId = process.env.COSMOS_DATABASE_ID || "UserAuthDB";
const containerId = process.env.COSMOS_CONTAINER_ID || "Users";

// Initialize database and container
async function initializeCosmosDB() {
  try {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Database: ${database.id} initialized`);
    
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    console.log(`Container: ${container.id} initialized`);
    
    return { database, container };
  } catch (error) {
    console.error("Error initializing Cosmos DB:", error);
    throw error;
  }
}

// Initialize Cosmos DB resources
let database;
let container;

initializeCosmosDB()
  .then(resources => {
    database = resources.database;
    container = resources.container;
    console.log("Cosmos DB initialized successfully");
  })
  .catch(error => {
    console.error("Failed to initialize Cosmos DB:", error);
  });

// Helper: Generate JWT Token
const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// =======================
// Auth Routes
// =======================

// Signup
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    if (!container) {
      throw new Error("Database not initialized");
    }

    // Check if user already exists
    const querySpec = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }]
    };

    const { resources: existingUsers } = await container.items.query(querySpec).fetchAll();

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash password and create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = {
      id: email.replace(/[^a-zA-Z0-9]/g, ""), // Create a valid document ID
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    const { resource: createdUser } = await container.items.create(newUser);
    
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Error registering user.", error: error.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    if (!container) {
      throw new Error("Database not initialized");
    }

    // Find user by email
    const querySpec = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }]
    };

    const { resources: users } = await container.items.query(querySpec).fetchAll();

    if (users.length === 0) {
      return res.status(400).json({ message: "User not found." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate and send JWT token
    const token = generateToken(user.id, user.email);

    res.json({ token, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in.", error: error.message });
  }
});

// =======================
// Other API Routes (Simulations)
// =======================

// Analyze Route
app.post('/api/analyze', (req, res) => {
  const { message, audienceLevel, mode } = req.body;

  setTimeout(() => {
    res.json({
      message: `AI response as ${audienceLevel} audience in ${mode} mode`,
      feedback: {
        clarity: Math.random() > 0.5 ? 'Clear explanation' : 'Some confusion points',
        pacing: 'Good pace, consider slowing down in technical parts',
        suggestions: 'Try using more analogies for complex concepts',
        questions: [
          'Can you explain how this relates to [topic]?',
          'What are the practical applications of this?',
        ],
      },
    });
  }, 1000);
});

// Speech-to-Text Route
app.post('/api/speech-to-text', (req, res) => {
  res.json({
    text: "This is a simulated transcription of your speech input.",
  });
});

// =======================
// Fallback for React SPA
// =======================
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Error serving index.html:", err);
      res.status(500).send("Error serving the application.");
    }
  });
});

// =======================
// Start Server
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
