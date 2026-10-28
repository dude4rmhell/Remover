import { NextResponse } from 'next/server';
const Groq = require("groq-sdk");

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function getRequestedModel(modelParam) {
    return modelParam || DEFAULT_MODEL;
}

function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error("GROQ_API_KEY is missing. Add it to your .env.local file before using the chat API.");
    }

    return new Groq({ apiKey });
}

// Call Groq LLaMA chat API
async function getGroqChatCompletion(content, modelParam) {
    const groq = getGroqClient();
    const model = getRequestedModel(modelParam);

    return groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: content
            }
        ],
        model
    });
}

// Process the response for clean code
async function getCleanCode(content, modelParam) {
    const chatCompletion = await getGroqChatCompletion(content, modelParam);
    let message = chatCompletion.choices[0]?.message?.content || "";

    // Extract code inside ``` blocks
    const codeMatch = message.match(/```(?:jsx|js)?([\s\S]*?)```/);
    if (codeMatch) {
        message = codeMatch[1].trim();
    }

    // Remove single-line comments
    message = message.replace(/^\s*\/\/.*$/gm, "").trim();

    // Remove multi-line comments
    message = message.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    return message;
}

// Handle both GET and POST requests
async function handleRequest(request) {
    const { searchParams } = new URL(request.url);
    const contentParam = searchParams.get('content');
    const codeParam = searchParams.get('code');
    const modelParam = searchParams.get('model');

    if (codeParam) {
        // Return clean code as plain text
        const response = await getCleanCode(codeParam, modelParam);
        return new NextResponse(response, {
            headers: { "Content-Type": "text/plain" }
        });
    }

    const response = await getGroqChatCompletion(contentParam || "Hi, how are you?", modelParam);
    const message = response.choices[0]?.message?.content || "";
    return NextResponse.json({ message, model: getRequestedModel(modelParam) });
}

export async function GET(request) {
    try {
        return await handleRequest(request);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred while generating a response." },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        return await handleRequest(request);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred while generating a response." },
            { status: 500 }
        );
    }
}
