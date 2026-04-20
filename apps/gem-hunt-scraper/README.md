# Gem Hunt Scraper

Lightweight Python service that wraps twscrape for Twitter scraping and PRAW for Reddit scraping.

## Setup

1. Create Twitter account (dedicated for scraping):
   - Fresh Twitter account recommended
   - Must have email + phone verified

2. Create Reddit app for PRAW:
   - Go to https://www.reddit.com/prefs/apps
   - Select "script" type
   - Note your client_id and client_secret

3. Install:
   ```
   pip install -r requirements.txt
   ```

4. Configure .env:
   ```
   TWITTER_USERNAME=your_bot_username
   TWITTER_PASSWORD=***
   TWITTER_EMAIL=your_bot@email.com

   # Reddit PRAW
   REDDIT_CLIENT_ID=your_reddit_client_id
   REDDIT_CLIENT_SECRET=your_reddit_client_secret
   REDDIT_USERNAME=your_reddit_username
   REDDIT_PASSWORD=your_reddit_password
   ```

5. Run:
   ```
   uvicorn main:app --reload --port 3002
   ```

## Endpoints

- `GET /health` — health check
- `GET /search/{keyword}?limit=20` — search Twitter for keyword
- `GET /search/reddit/{keyword}?limit=20` — search Reddit for keyword
- `GET /trending` — check trending crypto themes
