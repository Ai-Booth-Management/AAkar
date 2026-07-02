from fastapi import APIRouter, Depends
import httpx
import os
import datetime
from app.core.security import get_current_user
from app.domain.models.user import User
from app.core.config import settings

router = APIRouter()

@router.get("/overview")
async def get_intelligence_overview():
    news_api_key = settings.NEWSAPI_KEY
    
    fallback_response = {
        "location": {
            "state": "Delhi",
            "city": "New Delhi"
        },
        "summary": {
            "total_news": 0,
            "trending_topic": None,
            "most_mentioned_district": None
        },
        "news": []
    }
    
    if not news_api_key:
        print("Warning: NEWSAPI_KEY is not set. Returning empty news.")
        return fallback_response

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": "(Delhi OR \"New Delhi\") AND (election OR elections OR voting OR polls) AND (BJP OR \"Bharatiya Janata Party\")",
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 10,
        "apiKey": news_api_key
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            
        if response.status_code != 200:
            return fallback_response
            
        data = response.json()
        articles = data.get("articles", [])
        
        if not articles:
            return fallback_response
            
        news_list = []
        for article in articles:
            news_list.append({
                "title": article.get("title", ""),
                "summary": article.get("description", ""),
                "source": article.get("source", {}).get("name", "Unknown"),
                "url": article.get("url", ""),
                "image": article.get("urlToImage", ""),
                "published_at": article.get("publishedAt", "")
            })
            
        return {
            "location": {
                "state": "Delhi",
                "city": "New Delhi"
            },
            "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
            "summary": {
                "total_news": len(news_list),
                "trending_topic": "Elections & Local News",  # Mocked trending topic
                "most_mentioned_district": "New Delhi"       # Mocked district
            },
            "news": news_list
        }
    except Exception as e:
        print(f"Error fetching intelligence overview: {e}")
        return fallback_response
