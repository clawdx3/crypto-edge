import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import praw
import twscrape

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize twscrape API on startup
    api = twscrape.API()
    username = os.getenv("TWITTER_USERNAME")
    password = os.getenv("TWITTER_PASSWORD")
    email = os.getenv("TWITTER_EMAIL")
    if username and password and email:
        try:
            await api.login(username, password, email)
            app.state.api = api
            print(f"Twitter: logged in as @{username}")
        except Exception as e:
            print(f"Twitter login failed: {e}")
            app.state.api = None
    else:
        print("Twitter credentials not set, scraper will return empty results")
        app.state.api = None

    # Initialize PRAW Reddit client
    reddit_client_id = os.getenv("REDDIT_CLIENT_ID")
    reddit_client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    reddit_username = os.getenv("REDDIT_USERNAME")
    reddit_password = os.getenv("REDDIT_PASSWORD")

    if reddit_client_id and reddit_client_secret:
        try:
            reddit = praw.Reddit(
                client_id=reddit_client_id,
                client_secret=reddit_client_secret,
                username=reddit_username or "",
                password=reddit_password or "",
                user_agent="GemHunter/1.0 (crypto gem detection)"
            )
            # Test the connection
            reddit.user.me()
            app.state.reddit = reddit
            print(f"Reddit: logged in as {reddit_username}")
        except Exception as e:
            print(f"Reddit login failed: {e}")
            app.state.reddit = None
    else:
        print("Reddit credentials not set, using unauthenticated (read-only)")
        app.state.reddit = None

    yield
    # cleanup
    app.state.api = None
    app.state.reddit = None

app = FastAPI(title="Gem Hunt Scraper", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

class TweetResult(BaseModel):
    text: str
    likes: int
    rt: int
    impressions: int
    url: str

class SearchResponse(BaseModel):
    keyword: str
    post_count: int
    sentiment: float
    reach: int
    trending: bool
    avg_engagement: float
    sample_posts: list[TweetResult]

class RedditPost(BaseModel):
    title: str
    text: str
    score: int
    comments: int
    url: str
    subreddit: str
    created_hours_ago: int

class RedditSearchResponse(BaseModel):
    keyword: str
    post_count: int
    sentiment: float
    reach: int  # sum of scores
    trending: bool
    avg_engagement: float
    sample_posts: list[RedditPost]

def simple_sentiment(text: str) -> float:
    """Very basic sentiment: positive - negative words normalized"""
    positive = ["moon", "rocket", "gem", "to the", "pump", "call", "buy", "long", "win", "gain", "up", "hodl", "bull", "+", "🚀", "💰", "🙌", "❤️", "🔥", "WIN"]
    negative = ["rug", "dump", "scam", "sell", "short", "lose", "rugpull", "honeypot", "shit", "bad", "-", "🚨", "💀", "😢", "drop", "crash", "red"]
    text_lower = text.lower()
    pos = sum(1 for w in positive if w in text_lower)
    neg = sum(1 for w in negative if w in text_lower)
    total = pos + neg
    if total == 0:
        return 0.0
    return round((pos - neg) / total, 2)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/search/{keyword}")
async def search_twitter(keyword: str, limit: int = 20) -> SearchResponse:
    """
    Search Twitter for keyword and return signal data.
    Called by NestJS gem-hunt module.
    """
    api: Optional[twscrape.API] = getattr(app.state, "api", None)
    
    result = SearchResponse(
        keyword=keyword,
        post_count=0,
        sentiment=0.0,
        reach=0,
        trending=False,
        avg_engagement=0.0,
        sample_posts=[]
    )
    
    if api is None:
        # Return empty result if not logged in
        return result
    
    try:
        # Search tweets
        tweets = await api.searchTweets(keyword, limit=min(limit, 50), kv="Latest")
        
        posts: list[TweetResult] = []
        total_sentiment = 0.0
        total_engagement = 0
        reach = 0
        
        for tweet in tweets:
            likes = tweet.likeCount or 0
            rt = tweet.retweetCount or 0
            impressions = getattr(tweet, "viewCount", likes + rt) or (likes + rt)
            engagement = likes + rt * 2
            
            posts.append(TweetResult(
                text=tweet.rawContent or "",
                likes=likes,
                rt=rt,
                impressions=impressions,
                url=f"https://twitter.com/i/web/status/{tweet.id}"
            ))
            
            total_sentiment += simple_sentiment(tweet.rawContent or "")
            total_engagement += engagement
            reach += impressions
        
        if posts:
            result.post_count = len(posts)
            result.sentiment = round(total_sentiment / len(posts), 3)
            result.reach = reach
            result.avg_engagement = round(total_engagement / len(posts), 1)
            result.sample_posts = posts[:5]  # Return top 5 sample posts
            # Trending if > 15 posts and avg engagement > 100
            result.trending = len(posts) > 15 and result.avg_engagement > 100
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Twitter search failed: {str(e)}")

@app.get("/search/reddit/{keyword}")
async def search_reddit(keyword: str, limit: int = 20) -> RedditSearchResponse:
    """
    Search Reddit for keyword in crypto subreddits.
    """
    reddit = getattr(app.state, "reddit", None)
    
    result = RedditSearchResponse(
        keyword=keyword,
        post_count=0,
        sentiment=0.0,
        reach=0,
        trending=False,
        avg_engagement=0.0,
        sample_posts=[]
    )
    
    subreddits = ["CryptoMoonShots", "Solana", "memecoins", "CryptoCurrency", 
                  "SatoshiBets", "altcoin", "cryptomarkets", "DeFi"]
    
    try:
        posts_data = []
        for subreddit_name in subreddits[:5]:  # limit to 5 subs per search
            try:
                sub = reddit.subreddit(subreddit_name)
                for submission in sub.search(keyword, limit=min(limit, 10), sort="new"):
                    age_hours = (datetime.now() - datetime.fromtimestamp(submission.created_utc)).days * 24
                    age_hours += datetime.now().hour - datetime.fromtimestamp(submission.created_utc).hour
                    posts_data.append({
                        "title": submission.title,
                        "text": submission.selftext[:500] if submission.selftext else "",
                        "score": submission.score,
                        "comments": submission.num_comments,
                        "url": f"https://reddit.com{submission.permalink}",
                        "subreddit": subreddit_name,
                        "created_hours_ago": max(1, age_hours)
                    })
            except Exception:
                continue
        
        if posts_data:
            result.post_count = len(posts_data)
            result.reach = sum(p["score"] for p in posts_data)
            result.avg_engagement = round(sum(p["score"] + p["comments"] for p in posts_data) / len(posts_data), 1)
            # Use same sentiment function
            all_text = " ".join(p["title"] + " " + p["text"] for p in posts_data)
            result.sentiment = simple_sentiment(all_text)
            # Trending if > 10 posts in last 24h and avg engagement > 50
            recent = [p for p in posts_data if p["created_hours_ago"] <= 24]
            result.trending = len(recent) > 10 and result.avg_engagement > 50
            result.sample_posts = sorted(posts_data, key=lambda x: x["score"], reverse=True)[:5]
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reddit search failed: {str(e)}")

@app.get("/trending")
async def get_trending():
    """
    Get currently trending crypto topics.
    Uses Twitter's trending search as a proxy.
    """
    api: Optional[twscrape.API] = getattr(app.state, "api", None)
    
    themes = [
        "solana meme coin",
        "AI agent token", 
        "dogecoin",
        "pepe",
        "political coin",
        "DePIN",
        "memecoin",
        "rWA",
        "real world assets crypto",
    ]
    
    results = []
    if api is None:
        return [{"keyword": t, "active": False} for t in themes]
    
    for theme in themes:
        try:
            tweets = await api.searchTweets(theme, limit=5, kv="Latest")
            count = len(list(tweets)) if tweets else 0
            results.append({"keyword": theme, "active": count > 0, "recent_count": count})
        except:
            results.append({"keyword": theme, "active": False, "recent_count": 0})
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
