from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routes import temp_routes, forcast_routes, auth_routes, alert_routes, device_routes, analytics_routes, chat_routes
from utils.database import connect_to_mongo, close_mongo_connection
from jobs.data_snapshot_job import update_sensor_snapshot

load_dotenv()
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic (e.g. DB pool, caches, scheduler)."""
    logger.info("Starting up")
    await connect_to_mongo()

    await update_sensor_snapshot()
    scheduler.add_job(
        update_sensor_snapshot,
        trigger="interval",
        minutes=5,          
        id="sensor_snapshot",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(" Scheduler started — sensor snapshot will refresh every hour.")

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
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
app.include_router(alert_routes.router, prefix="/api/v1", tags=["alerts"])
app.include_router(device_routes.router, prefix="/api/v1", tags=["device"])
app.include_router(analytics_routes.router, prefix="/api/v1", tags=["analytics"])
app.include_router(chat_routes.router, prefix="/api/v1", tags=["chat"])

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