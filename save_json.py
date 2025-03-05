from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import pandas as pd
import json

# ✅ Authenticate using Azure AD (instead of connection string)
credential = DefaultAzureCredential()
STORAGE_ACCOUNT_NAME = "stthalassaemia"
CONTAINER_NAME = "chatlogs"

# ✅ Create BlobServiceClient using Azure AD authentication
blob_service_client = BlobServiceClient(
    f"https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net", credential=credential
)
container_client = blob_service_client.get_container_client(CONTAINER_NAME)

# ✅ List all blobs
blob_list = container_client.list_blobs()
data = []

# ✅ Loop through each JSON file, download, and parse
for blob in blob_list:
    blob_client = container_client.get_blob_client(blob.name)
    blob_data = blob_client.download_blob().readall()
    
    # Convert JSON to Python dictionary
    record = json.loads(blob_data)
    data.append(record)

# ✅ Convert to Pandas DataFrame
df = pd.DataFrame(data)

# ✅ Display first few rows
print(df.head())

# ✅ Save DataFrame as CSV
df.to_csv("chat_data.csv", index=False)

print("✅ Data has been saved to 'chat_data.csv'. You can download and analyze it.")

