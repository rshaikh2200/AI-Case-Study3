import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { BedrockClient } from "@aws-sdk/client-bedrock";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock"; // Ensure correct import

export async function POST(req) {
    try {
        const data = await req.json();
        const prompt = data.body;
        const modelType = data.type; // Get the model type from the request

        if (modelType === "gemini") {
            // Handle Google Generative AI
            const genAI = new GoogleGenerativeAI(process.env.API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: "You are a customer service chatbot."
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const output = await response.text();

            return NextResponse.json({ output: output });
        } else if (modelType === "aws") {
            // Handle AWS Bedrock
            const bedrockClient = new BedrockClient({
                region: "us-east-1",
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
            });

            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-v2",
                prompt: prompt,
            });

            const response = await bedrockClient.send(command);
            const output = response.completion; // Adjust based on Bedrock's response structure

            return NextResponse.json({ output: output });
        } else {
            return NextResponse.json({ error: "Invalid model type selected." });
        }
    } catch (error) {
        console.log("Request error: %s", error);
        return NextResponse.json({ error: "An error occurred while processing your request." });
    }
}
