import json
import datetime
import random
try:
    from gnews import GNews
except ImportError:
    print("[-] GNews library not found. Install it with: pip install gnews")
    # Fallback class defined below if needed, but for this step we assume it's installed.
    class GNews:
        def __init__(self): pass
        def get_news(self, q): return []

class OpportunityEngine:
    def __init__(self):
        # Initialize GNews client
        self.news_client = GNews(max_results=5, period='7d')
        
    def fetch_news_opportunities(self, domain):
        """Fetches real news articles using GNews."""
        print(f"[*] Fetching live news for: {domain}...")
        
        try:
            # Fetch for competitions, hackathons, and exams
            queries = [
                f"{domain} box hackathon student",
                f"{domain} internship 2025", 
                f"{domain} exam dates 2025"
            ]
            
            raw_results = []
            for q in queries:
                news = self.news_client.get_news(q)
                if news:
                    raw_results.extend(news)
            
            opportunities = []
            seen_titles = set()

            for item in raw_results:
                if item['title'] in seen_titles:
                    continue
                seen_titles.add(item['title'])
                
                opportunities.append({
                    "title": item.get('title'),
                    "type": "News",
                    "date": item.get('published date'),
                    "link": item.get('url'),
                    "tags": [domain]
                })
            
            return opportunities
            
        except Exception as e:
            print(f"[!] Error fetching news: {e}")
            return []

    def get_academic_calendar(self):
        """Standard Schema for NPTEL/AICTE exams (Manual/Static Source)."""
        return [
            {"title": "NPTEL Python Exam", "type": "Exam", "date": "2025-10-25", "tags": ["Python", "CS"]},
            {"title": "GATE 2026 Registration Deadline", "type": "Deadline", "date": "2025-09-30", "tags": ["Engineering"]},
            {"title": "AICTE Internship Fair", "type": "Internship", "date": "2025-11-05", "tags": ["All"]},
            {"title": "Smart India Hackathon Finals", "type": "Hackathon", "date": "2025-12-10", "tags": ["Coding", "Innovation"]}
        ]

    def match_interests(self, user_profile, all_events):
        """Filters events based on user tags."""
        matched = []
        user_interests = [i.lower() for i in user_profile['interests']]
        
        for event in all_events:
            event_tags = [t.lower() for t in event.get('tags', [])]
            # Simple keyword match in title as fallback for news items without specific tags
            title_lower = event['title'].lower()
            
            is_match = False
            
            # Check explicit tags
            if "all" in event_tags or set(event_tags) & set(user_interests):
                is_match = True
            
            # Check title for keywords
            if not is_match:
                for interest in user_interests:
                    if interest in title_lower:
                        is_match = True
                        break
            
            if is_match:
                matched.append(event)
        
        return matched

    def run_daily_sync(self, user_profile):
        print("\n=== StudentOS Opportunity Engine (Live Mode) ===")
        
        # 1. Fetch Dynamic News
        news_events = []
        for interest in user_profile['interests']:
            news_events.extend(self.fetch_news_opportunities(interest))
            
        # 2. Get Static Academic Calendar
        academic_events = self.get_academic_calendar()
        
        # 3. Combine
        all_pool = news_events + academic_events
        print(f"[*] Total Raw Opportunities found: {len(all_pool)}")
        
        # 4. Match
        final_list = self.match_interests(user_profile, all_pool)
        
        print(f"[*] Final Matched Opportunities for {user_profile['name']}: {len(final_list)}")
        return final_list

if __name__ == "__main__":
    # Mock User Profile
    mock_user = {
        "name": "Anil",
        "interests": ["Python", "AI", "Startup"]
    }
    
    engine = OpportunityEngine()
    opportunities = engine.run_daily_sync(mock_user)
    
    print("\n--- YOUR DAILY BRIEFING ---")
    print(json.dumps(opportunities, indent=2))
