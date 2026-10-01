import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { InvalidAiResponseError, normalizeAiResponse } from "../utils/aiResponse.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const SYSTEM_INSTRUCTION = `You are an expert MERN stack developer with 10 years of experience, working inside a collaborative coding workspace.

How you write code:
- Write modular, scalable, maintainable code that follows best practices.
- Add clear, useful comments.
- Handle errors, exceptions and edge cases.
- Create as many files and folders as the project needs.

How to answer:
- Put your explanation for the user in "text" (markdown). Keep it short and do not repeat file contents there - the files are shown in the editor.
- Put every file you create in "files", each with a relative "path" (folders allowed, e.g. "src/components/Header.jsx") and its complete "contents". Never leave placeholders like "// rest of code".
- For conversational messages that need no code, return only "text" and an empty "files" list.
- When you create a runnable project, include a package.json and set "startCommand" to the single command that starts it (e.g. "npm start" or "npm run dev"). Dependencies are installed automatically; do not include "npm install".
- The project runs inside a browser-based Node.js environment (WebContainer): web servers must listen on a port, and native/binary npm packages are not supported.
- Dependencies are installed in the browser, so every extra package makes the project slower to start. Use the smallest set that does the job, and only add build tooling (bundlers, CSS frameworks, UI kits) when the user asks for it or the task genuinely needs it.`;

// Structured output: Gemini enforces this shape, so replies are always
// parseable JSON with files as a flat list (no deeply nested tree).
const RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        text: {
            type: SchemaType.STRING,
            description: "Markdown message for the user. Do not repeat file contents here.",
        },
        files: {
            type: SchemaType.ARRAY,
            description: "Files to create or overwrite. Empty when no code is needed.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    path: { type: SchemaType.STRING, description: "Relative path, e.g. src/App.jsx" },
                    contents: { type: SchemaType.STRING, description: "Complete file contents" },
                },
                required: ["path", "contents"],
            },
        },
        startCommand: {
            type: SchemaType.STRING,
            description: "Single shell command that starts the project, e.g. npm run dev",
        },
    },
    required: ["text", "files"],
};

// Individual Gemini models get retired (gemini-2.0-flash, 2.5-flash) or
// temporarily overloaded (503 "high demand"), so requests go through an
// ordered list of models and move on to the next one when a model is
// unavailable. Both lists can be changed in .env without a code change:
//   GOOGLE_AI_MODEL=gemini-flash-latest
//   GOOGLE_AI_FALLBACK_MODELS=gemini-3.6-flash,gemini-3.5-flash
const DEFAULT_MODEL = "gemini-flash-latest";
const DEFAULT_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"];

const parseModelList = (value) =>
    value ? value.split(",").map((name) => name.trim()).filter(Boolean) : null;

const MODEL_NAMES = [
    ...new Set([
        process.env.GOOGLE_AI_MODEL || DEFAULT_MODEL,
        ...(parseModelList(process.env.GOOGLE_AI_FALLBACK_MODELS) ?? DEFAULT_FALLBACK_MODELS),
    ]),
];

// Generating a whole project takes 1-2 minutes (a 26-file React template
// measured ~100s), but a hung model must not leave the chat waiting forever.
const REQUEST_TIMEOUT_MS = 180_000;
const ROUNDS = 2;
const DELAY_BETWEEN_ROUNDS_MS = 2000;

// 400/401/403 mean a bad request or API key: another model won't help.
// 404 (retired model), 429 (rate limit), 5xx (overload), network errors,
// timeouts and malformed replies are worth trying on the next model.
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403]);
const isRetryable = (error) => !NON_RETRYABLE_STATUSES.has(error.status);

const models = MODEL_NAMES.map((name) => ({
    name,
    model: genAI.getGenerativeModel(
        {
            model: name,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
                temperature: 0.4,
            },
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        { timeout: REQUEST_TIMEOUT_MS }
    ),
}));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const describeError = (error) =>
    error instanceof InvalidAiResponseError ? error.message : error.status ?? "network/timeout";

/**
 * Generates a reply for `prompt` and returns it as a JSON string in the
 * shape the frontend expects: { text, fileTree?, startCommand? }.
 */
export const generateResult = async (prompt) => {
    let lastError;

    for (let round = 1; round <= ROUNDS; round++) {
        for (const { name, model } of models) {
            try {
                const result = await model.generateContent(prompt);
                return JSON.stringify(normalizeAiResponse(result.response.text()));
            } catch (error) {
                if (!isRetryable(error)) throw error;
                console.log(`AI model ${name} failed (${describeError(error)}), trying next`);
                lastError = error;
            }
        }
        if (round < ROUNDS) await sleep(DELAY_BETWEEN_ROUNDS_MS);
    }

    throw lastError;
};
