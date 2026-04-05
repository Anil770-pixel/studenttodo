// popup.js - The Sync Engine
const FIREBASE_API_KEY = "AIzaSyAN85fYZgF-UP1yeF-vbMo3R0IZwvGUK48";
const PROJECT_ID = "student-3bff7";

const syncBtn = document.getElementById("sync-btn");
const courseNameElem = document.getElementById("course-name");
const courseWeeksElem = document.getElementById("course-weeks");
const userIdInput = document.getElementById("user-id");

let scrapedData = null;

// Initialize: Get UID from storage
chrome.storage.local.get(["userId"], (result) => {
  if (result.userId) userIdInput.value = result.userId;
});

// 1. Request Scrape from Content Script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeCourse" }, (response) => {
    if (response) {
      scrapedData = response;
      courseNameElem.innerText = response.courseName || "Unknown Course";
      courseWeeksElem.innerText = `${response.weeks} Weeks`;
    }
  });
});

// 2. Sync to Firebase
syncBtn.addEventListener("click", async () => {
  const userId = userIdInput.value.trim();
  if (!userId) {
    alert("Please enter your StudentOS User ID first.");
    return;
  }

  // Save UID for next time
  chrome.storage.local.set({ userId });

  if (!scrapedData) {
    alert("Could not detect course data. Are you on a Swayam course page?");
    return;
  }

  syncBtn.innerText = "Syncing...";
  syncBtn.disabled = true;

  try {
    const assignments = generateSchedule(scrapedData);
    await pushToFirebase(userId, assignments);
    
    syncBtn.innerText = "Course Shielded!";
    syncBtn.style.background = "#fff";
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error("Sync Error:", error);
    alert("Sync Failed: Check your User ID or connection.");
    syncBtn.innerText = "Sync Course to Shield";
    syncBtn.disabled = false;
  }
});

function generateSchedule(data) {
  const assignments = [];
  const startDate = new Date(data.startDate);

  for (let i = 1; i <= data.weeks; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(startDate.getDate() + (i * 7));

    assignments.push({
      courseName: data.courseName,
      weekNumber: `Week ${i} Assignment`,
      lastDate: dueDate.toISOString().split('T')[0],
      status: 'pending',
      type: 'swayam_assessment',
      reminderSet: true,
      createdAt: new Date().toISOString()
    });
  }

  // Add Exam Milestones
  const feeDate = new Date(startDate);
  feeDate.setDate(startDate.getDate() + 21);
  const examDate = new Date(startDate);
  examDate.setDate(startDate.getDate() + (data.weeks * 7) + 14);

  assignments.push(
    { courseName: data.courseName, weekNumber: "Exam Fee Registration", lastDate: feeDate.toISOString().split('T')[0], status: 'pending', type: 'swayam_fee', reminderSet: true, createdAt: new Date().toISOString() },
    { courseName: data.courseName, weekNumber: "Final Proctored Exam", lastDate: examDate.toISOString().split('T')[0], status: 'pending', type: 'swayam_exam', reminderSet: true, createdAt: new Date().toISOString() }
  );

  return assignments;
}

async function pushToFirebase(userId, assignments) {
  // We use the Firestore REST API to avoid full SDK bloat in the extension
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/assessments?key=${FIREBASE_API_KEY}`;
  
  for (const item of assignments) {
    const fields = {};
    for (const [key, value] of Object.entries(item)) {
      fields[key] = { stringValue: String(value) };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) throw new Error("Firebase Write Failed");
  }
}
