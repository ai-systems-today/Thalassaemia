#!/bin/bash

# Set once
STORAGE_ACCOUNT="stthalassaemia"
CONTAINER="content"
RESOURCE_GROUP="tif-production"
SUBSCRIPTION_ID="5917d421-d961-42c9-94a8-30c00b43e086"
SEARCH_SERVICE="gptkb-thalassaemia"
INDEX_NAME="gptkbindex"
DOCUMENT_INTELLIGENCE_SERVICE="cog-di-thalassaemia"

FILES=(
"Br J Haematol - 2016 - Davis - Guidelines on red cell transfusion in sickle cell disease  Part I  principles and laboratory.pdf"
"Br J Haematol - 2016 - Davis - Guidelines on red cell transfusion in sickle cell disease  Part II  indications for.pdf"
"Br J Haematol - 2020 - Trompeter - Position paper on International Collaboration for Transfusion Medicine  ICTM  Guideline .pdf"
"Br J Haematol - 2021 - Oteng-Ntim - Management of sickle cell disease in pregnancy  A British Society for Haematology.pdf"
"Br J Haematol - 2021 - Shah - Guidelines for the monitoring and management of iron overload in patients with.pdf"
"Br J Haematol - 2023 - Soutar - Guideline on the investigation and management of acute transfusion reactions.pdf"
)

for FILE in "${FILES[@]}"; do
  echo "Removing: $FILE"
  python ./app/backend/prepdocs.py "./data/$FILE" \
    --storageaccount "$STORAGE_ACCOUNT" \
    --container "$CONTAINER" \
    --storageresourcegroup "$RESOURCE_GROUP" \
    --subscriptionid "$SUBSCRIPTION_ID" \
    --searchservice "$SEARCH_SERVICE" \
    --index "$INDEX_NAME" \
    --documentintelligenceservice "$DOCUMENT_INTELLIGENCE_SERVICE" \
    --novectors \
    --remove
done

