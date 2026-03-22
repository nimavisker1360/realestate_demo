import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { userRoute } from "./routes/userRoute.js";
import { residencyRoute } from "./routes/residencyRoute.js";
import { consultantRoute } from "./routes/consultantRoute.js";
import { emailRoute } from "./routes/emailRoute.js";
import { blogRoute } from "./routes/blogRoute.js";
import { housingSalesRoute } from "./routes/housingSalesRoute.js";
import { testimonialRoute } from "./routes/testimonialRoute.js";
import { assistantRoute } from "./routes/assistantRoute.js";
import { marketRoute } from "./routes/marketRoute.js";
import { aiSalesAgentRoute } from "./routes/aiSalesAgentRoute.js";
import { uploadRoute } from "./routes/uploadRoute.js";
import { loadBackendEnv } from "./config/loadEnv.js";

loadBackendEnv();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Routes
app.use("/api/user", userRoute);
app.use("/api/residency", residencyRoute);
app.use("/api/consultant", consultantRoute);
app.use("/api/email", emailRoute);
app.use("/api/blog", blogRoute);
app.use("/api/housing-sales", housingSalesRoute);
app.use("/api/testimonial", testimonialRoute);
app.use("/api/assistant", assistantRoute);
app.use("/api/ai-agent", aiSalesAgentRoute);
app.use("/api/market", marketRoute);
app.use("/api/upload", uploadRoute);

export default app;
