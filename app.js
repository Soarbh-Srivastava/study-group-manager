import express from "express";
import path from "path";

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/auth", require("./routes/auth.js"));
app.use("/notes", require("./routes/notes.js"));
app.use("/groups", require("./routes/groups.js"));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
