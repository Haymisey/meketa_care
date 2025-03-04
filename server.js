const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Configure environment variables
const MODEL_NAME = "gemini-2.0-flash"; // Choose your Gemini model
const API_KEY = "AIzaSyA4JjNz7O4_G82qNzNWZZFzwGy6pMQJErI"; // Replace with your actual API key
const OPENCAGE_API_KEY = "8562e2e112ea43dbaf148f1fc57d0d26"; // Replace with your OpenCage API key

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Function to geocode an address using OpenCage API
async function geocodeAddress(address) {
  try {
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
        address
      )}&key=${OPENCAGE_API_KEY}`
    );

    if (response.data.results.length === 0) {
      throw new Error("No results found for the provided address.");
    }

    const { lat, lng } = response.data.results[0].geometry;
    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error("Error geocoding address:", error);
    throw new Error("Unable to geocode address.");
  }
}

// Endpoint to geocode address
app.post("/geocode-address", async (req, res) => {
  const { address } = req.body;
  try {
    const { latitude, longitude } = await geocodeAddress(address);
    res.json({ latitude, longitude });
  } catch (error) {
    res.status(500).json({ error: "Unable to geocode address." });
  }
});

// Endpoint to analyze symptoms
app.post("/analyze-symptoms", async (req, res) => {
  const { symptoms } = req.body;

  try {
    const prompt = `The user is experiencing: ${symptoms}. Provide only a numbered list of additional symptoms with no explanation to help accurately identify the disease.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recommendations = response.text();

    res.json({ recommendations });
  } catch (error) {
    console.error("Error analyzing symptoms:", error);
    res.status(500).json({ error: "Unable to analyze symptoms." });
  }
});

// Endpoint to diagnose disease
app.post("/diagnose-disease", async (req, res) => {
  const symptoms = req.body.symptoms;
  console.log("Symptoms:", symptoms);
  if (!symptoms || symptoms.length === 0) {
    return res.status(400).json({ error: "No symptoms provided." });
  }

  try {
    const prompt = `Diagnose the most likely disease based on these symptoms: ${symptoms.join(
      ", "
    )}. Respond ONLY with the name of the disease that a normal person could understand and suggest a home remedy if it could be treated at home and suggest over-the-counter medication.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const disease = responseText.trim();

    res.json({ disease: disease });
    console.log("Diagnosed Disease:", disease);
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to diagnose disease." });
  }
});

// Endpoint to find nearby pharmacies using OpenCage and Overpass API
app.post("/find-pharmacies", async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    // Step 1: Query OpenStreetMap Overpass API for pharmacies
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node[amenity=pharmacy](around:5000,${latitude},${longitude});out 7;`;
    const response = await axios.get(overpassUrl);

    // Step 2: Parse the response
    const pharmacies = response.data.elements.map((element) => ({
      name: element.tags.name || "Unnamed Pharmacy",
      latitude: element.lat,
      longitude: element.lon,
    }));

    res.json({ pharmacies });
  } catch (error) {
    console.error("Error finding pharmacies:", error);
    res.status(500).json({ error: "Unable to find nearby pharmacies." });
  }
});

// Initialize server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
