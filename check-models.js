/* eslint-disable no-undef */
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
    if (!API_KEY) {
        console.error("No API Key found in .env");
        return;
    }

    try {
        // const genAI = new GoogleGenerativeAI(API_KEY);
        // Note: listModels is not directly on genAI instance in some versions, 
        // but usually on the model manager or we just try a simple generation to see specific error detail
        // Actually, newer SDKs don't expose listModels easily in the entry point.
        // Let's try to just hit the API with a raw fetch to get the list.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("Could not list models. Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
