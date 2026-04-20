# Gem Hunt Scraper

Lightweight Python service that wraps twscrape for Twitter scraping.

## Setup

1. Create Twitter account (dedicated for scraping):
   - Fresh Twitter account recommended
   - Must have email + phone verified

2. Install:
   ```
   pip install -r requirements.txt
   ```

3. Configure .env:
   ```
   TWITTER_USERNAME=your_bot_username
   TWITTER_PASSWORD=your_bot_password
   TWITTER_EMAIL=your_bot@email.com
   ```

4. Run:
   ```
   uvicorn main:app --reload --port 3002
   ```

## Endpoints

- `GET /health` — health check
- `GET /search/{keyword}?limit=20` — search Twitter for keyword
- `GET /trending` — check trending crypto themes
