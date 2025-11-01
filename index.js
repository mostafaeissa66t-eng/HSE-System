// =================================================================
// index.js (Final V8 - No Placeholder Variable)
// =================================================================
const express = require("express");
const fetch = require("node-fetch"); // Ensure node-fetch@2 is installed
const path = require("path");

const app = express();
app.use(express.json());

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
    const indexPath = path.join(__dirname, "public", "index.html");
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("[Startup Error] Error sending index.html:", err);
            res.status(404).send("Error: index.html not found.");
        }
    });
});

// !!! --- === === === === === === === === === === === === --- !!!
// !!! --- الصق رابط جوجل آب سكريبت هنا بمنتهى الدقة --- !!!
const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxBQ-wOAgNlB3C637_HcT_QhtPbnpF4EFJmFeTxT6NqUkDO13B5yrV5R2YrJ8oyvvpudg/exec";
// !!! --- === === === === === === === === === === === === --- !!!

// Log initial value
console.log("--- Initial GOOGLE_SCRIPT_URL Check ---");
console.log("Value:", `"${GOOGLE_SCRIPT_URL}"`);
// This is the new, safer check:
const isUrlValid =
    GOOGLE_SCRIPT_URL &&
    GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/");
console.log("Is it a valid Google Script URL?", isUrlValid);
console.log("--- End Initial Check ---");

// API Proxy Endpoint
app.post("/api", async (req, res) => {
    console.log("\n--- Received request for /api ---");
    const action = req.body ? req.body.action : "No Action";
    console.log("Action:", action);

    // --- <<< New Safer Check >>> ---
    // Re-check the URL validity on every request
    const isUrlValidOnRequest =
        GOOGLE_SCRIPT_URL &&
        GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/");
    console.log(`Checking URL before fetch: IsUrlValid=${isUrlValidOnRequest}`);
    // --- <<< End Check >>> ---

    try {
        // If the URL is NOT valid, throw the error
        if (!isUrlValidOnRequest) {
            console.error(
                "FATAL ERROR: GOOGLE_SCRIPT_URL is invalid or not set correctly!",
            );
            throw new Error(
                "Google Script URL is not configured on the server.",
            );
        }
        if (!req.body || !action || action === "No Action") {
            console.error("Error: Request body or action missing.");
            throw new Error("Request body or action is missing.");
        }

        console.log(`Forwarding action "${action}"...`);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
            redirect: "follow",
        });
        const responseText = await response.text();
        if (!response.ok) {
            console.error(
                `Google Script fetch error (${response.status}) for ${action}: ${responseText}`,
            );
            return res.status(response.status || 500).json({
                status: "error",
                message: `GS Error: ${response.statusText}`,
                details: responseText,
            });
        }
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error(
                `JSON Parse Error for ${action}:`,
                e,
                "Raw:",
                responseText,
            );
            throw new Error(
                `Invalid Response: ${responseText.substring(0, 100)}...`,
            );
        }
        console.log(`Received response for ${action}. Status: ${data.status}`);
        res.json(data);
    } catch (error) {
        console.error("!!! UNEXPECTED Error in /api proxy:", error);
        if (!res.headersSent) {
            res.status(500).json({
                status: "error",
                message: `Proxy error: ${error.message}`,
            });
        }
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running! Listening on port ${PORT}`);
    // Final startup check
    if (!isUrlValid) {
        console.warn(
            "************************************************************",
        );
        console.warn(
            "!!! CRITICAL WARNING: GOOGLE_SCRIPT_URL IS NOT SET CORRECTLY !!!",
        );
        console.warn(`Current Value: "${GOOGLE_SCRIPT_URL}"`);
        console.warn("<<< PASTE THE CORRECT URL BETWEEN THE QUOTES >>>");
        console.warn(
            "************************************************************",
        );
    } else {
        console.log("GOOGLE_SCRIPT_URL looks valid on startup.");
        console.log(`Using URL: ${GOOGLE_SCRIPT_URL.substring(0, 40)}...`);
    }
});
// =================================================================
