// content.js - Deterministic Scraper for Swayam
console.log("StudentOS Scraper Active");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeCourse") {
    const data = scrapeSwayamDetails();
    sendResponse(data);
  }
  return true;
});

function scrapeSwayamDetails() {
  const details = {
    courseName: "",
    weeks: 8,
    startDate: new Date().toISOString().split('T')[0]
  };

  // 1. Extract Course Name
  const titleElem = document.querySelector('h1.title, .course-name, h1');
  if (titleElem) details.courseName = titleElem.innerText.trim();

  // 2. Extract Metadata from Summary List
  const metadataItems = document.querySelectorAll('li, .item-list');
  metadataItems.forEach(item => {
    const text = item.innerText.toLowerCase();
    
    // Check for Duration (Weeks)
    if (text.includes("duration") || text.includes("weeks")) {
      const weekMatch = text.match(/(\d+)\s*weeks/i);
      if (weekMatch) details.weeks = parseInt(weekMatch[1]);
    }

    // Check for Start Date
    if (text.includes("start date")) {
      // Find date pattern (e.g. 26 Jan 2026 or 2026-01-26)
      const dateMatch = item.innerText.match(/(\d{1,2}\s+[a-z]{3}\s+\d{4})/i);
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[1]);
        if (!isNaN(parsedDate)) {
          details.startDate = parsedDate.toISOString().split('T')[0];
        }
      }
    }
  });

  console.log("Scraped Data:", details);
  return details;
}
