"""MongoDB client – single shared instance for the whole backend."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def _clean(doc: dict) -> dict:
    """Strip Mongo's internal _id before returning a document over the API."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc
