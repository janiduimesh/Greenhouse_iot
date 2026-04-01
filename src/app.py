from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
from dotenv import load_dotenv
from routes import temp_routes, forcast_routes, auth_routes
from utils.database import connect_to_mongo, close_mongo_connection

load_dotenv()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic (e.g. DB pool, caches)."""
    logger.info("Starting up")
    await connect_to_mongo()
    try:
        yield
    finally:
        await close_mongo_connection()
        logger.info("Shutting down")


app = FastAPI(
    title="Greenhouse IoT",
    description="A greenhouse IoT application",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(temp_routes.router, prefix="/api/v1", tags=["temp"])
app.include_router(forcast_routes.router, prefix="/api/v1", tags=["forcast"])
app.include_router(auth_routes.router, prefix="/api/v1", tags=["auth"])
# app.include_router(temp_routes.router, tags=["temp-compat"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Greenhouse IoT API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        loop="asyncio"  
    )