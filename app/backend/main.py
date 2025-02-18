from dotenv import load_dotenv  # Import dotenv at the top of the file
import os
from app import create_app

# Load environment variables from the .env file
load_dotenv('/workspaces/azure-search-openai-demo/.azure/cy-thalassaemia/.env')

# Now you can access the environment variable
chatlogs = os.getenv('AZURE_STORAGE_CHATLOGS')

# if chatlogs:
#     print(f'Chatlogs container: {chatlogs}')
# else:
#     print('Environment variable not set correctly')

app = create_app()
# app.run(debug=True, host="0.0.0.0", port=8000)
# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=8000)