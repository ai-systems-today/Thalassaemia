import express from "express";
import { json } from "body-parser";
import { BlobServiceClient } from "@azure/storage-blob"; // For Azure Blob Storage
import { mw } from "request-ip";

const app = express();

app.use(json());
app.use(mw()); // Middleware to get user IP

const AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=stthalassaemia;AccountKey=KiKJ7xgCmDSjclAHkVrXvAiQBGwzhfOeEb2o6mXkXvS+yc3KejW8JVW9FFeU5y8XqIzvUCpBeRSH+AStJDaDeg==;EndpointSuffix=core.windows.net";
const containerName = "chatlogs";

app.post("/saveChat", async (req, res) => {
    try {
        const { chatId, timestamp, question, answer } = req.body;

        if (!chatId || !timestamp || !question || !answer) {
            return res.status(400).send("Missing required fields.");
        }

        const userIP = req.clientIp || "Unknown";

        // Prepare chat data
        const chatData = {
            chatId,
            timestamp,
            userIP,
            question,
            answer,
        };

        // Connect to Azure Blob Storage
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure the container exists
        await containerClient.createIfNotExists();

        // Create a blob file for this chat
        const blobName = `${chatId}-${timestamp}.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const chatDataJson = JSON.stringify(chatData, null, 2);

        await blockBlobClient.upload(chatDataJson, chatDataJson.length);

        res.status(200).send("Chat data saved successfully.");
    } catch (error) {
        console.error("Error saving chat:", error);
        res.status(500).send("Failed to save chat data.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
