const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: path.resolve(__dirname, envFile) });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost with any port
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }

    // Allow any subdomain of afi.dev
    if (origin.match(/^https?:\/\/[a-zA-Z0-9-]+\.afi\.dev$/)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Google Maps Places API proxy endpoint
app.get("/api/places", async (req, res) => {
  try {
    const { input, types } = req.query;

    if (!input) {
      return res
        .status(400)
        .json({ error: "Input query parameter is required" });
    }

    const response = await axios.post(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        input,
        includedPrimaryTypes: types ? [types] : undefined,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.text.text,suggestions.placePrediction.placeId,suggestions.placePrediction.types",
        },
      }
    );

    // Transform the response to match the previous API structure
    const predictions = response.data.suggestions.map((suggestion) => ({
      description: suggestion.placePrediction.text.text,
      place_id: suggestion.placePrediction.placeId,
      types: suggestion.placePrediction.types,
    }));

    res.json({ predictions });
  } catch (error) {
    console.error("Error fetching places data:", error);
    res.status(500).json({ error: "Failed to fetch places data" });
  }
});

// Weather API endpoint
app.get("/api/current-conditions", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const response = await axios.get(
      "https://weather.googleapis.com/v1/currentConditions:lookup",
      {
        params: {
          key: process.env.GOOGLE_MAPS_API_KEY,
          "location.latitude": latitude,
          "location.longitude": longitude,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Forecast API endpoint
app.get("/api/forecast", async (req, res) => {
  try {
    const { latitude, longitude, days } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    // Validate and limit days parameter
    const requestedDays = parseInt(days) || 1;
    if (requestedDays < 1 || requestedDays > 7) {
      return res
        .status(400)
        .json({ error: "Days parameter must be between 1 and 7" });
    }

    const response = await axios.get(
      "https://weather.googleapis.com/v1/forecast/days:lookup",
      {
        params: {
          key: process.env.GOOGLE_MAPS_API_KEY,
          "location.latitude": latitude,
          "location.longitude": longitude,
          days: requestedDays,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    res.status(500).json({ error: "Failed to fetch forecast data" });
  }
});

// Hourly Forecast API endpoint
app.get("/api/hourly-forecast", async (req, res) => {
  try {
    const { latitude, longitude, hours } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const response = await axios.get(
      "https://weather.googleapis.com/v1/forecast/hours:lookup",
      {
        params: {
          key: process.env.GOOGLE_MAPS_API_KEY,
          "location.latitude": latitude,
          "location.longitude": longitude,
          hours: hours || 24,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching hourly forecast data:", error);
    res.status(500).json({ error: "Failed to fetch hourly forecast data" });
  }
});

// Place Details API endpoint
app.get("/api/place-details", async (req, res) => {
  try {
    const { placeId } = req.query;

    if (!placeId) {
      return res
        .status(400)
        .json({ error: "placeId query parameter is required" });
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          key: process.env.GOOGLE_MAPS_API_KEY,
          place_id: placeId,
          fields: "geometry,name,formatted_address",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching place details:", error);
    res.status(500).json({ error: "Failed to fetch place details" });
  }
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
