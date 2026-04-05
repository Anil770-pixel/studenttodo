// User provided key
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const COMP_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "llama-3.2-11b-vision-preview";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Standard Chat Completion using Fetch
 */
export const getGroqCompletion = async (prompt) => {
    // If prompt is a string, wrap it. If it's already an array/object logic, handle it?
    // The existing call interface was getGroqCompletion(promptString).
    // We will support a simple string prompt.

    // Check if prompt is actually the full message history (as passed from AiSchedule)
    // AiSchedule passes a long string: `${systemPrompt}\n\nChat History...`

    const messages = [
        { role: "system", content: "You always output valid JSON." },
        { role: "user", content: prompt }
    ];

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: messages,
                model: COMP_MODEL,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data; // Compatible structure with SDK result (data.choices[0].message.content)
    } catch (error) {
        console.error("Groq Completions Error:", error);
        throw error;
    }
};

/**
 * Parses a syllabus file (Image) using Groq Vision via Fetch.
 * @param {File} file 
 * @returns {Promise<Array>}
 */
/**
 * Robustly parses JSON from Groq responses, handling markdown code blocks.
 * @param {string} content 
 * @returns {any} Parsed JSON object or array
 */
export function parseGroqJSON(content) {
    try {
        // 1. Try direct parse
        return JSON.parse(content);
    } catch {
        // 2. Try extracting from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch {
                // Continue to cleanup
            }
        }

        // 3. Brute force cleanup
        const cleaned = content
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        return JSON.parse(cleaned);
    }
}

/**
 * Parses a syllabus file (Image) using Groq Vision via Fetch.
 * @param {File} file 
 * @returns {Promise<Array>}
 */
export async function parseSyllabusWithGroq(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Image = reader.result;

            try {
                const response = await fetch(GROQ_API_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: `
                                        Extract all IMPORTANT dates (exams, quizzes, assignment deadlines) from this syllabus/schedule.
                                        Return ONLY a valid JSON array of objects.
                                        Format: [{"title": "Event Name", "date": "YYYY-MM-DD", "type": "exam/study/project", "description": "details"}]
                                        If year is missing, assume upcoming.
                                        `
                                    },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: base64Image
                                        }
                                    }
                                ]
                            }
                        ],
                        model: VISION_MODEL,
                        temperature: 0.1,
                        max_tokens: 1024,
                        top_p: 1,
                        stream: false,
                        response_format: { type: "json_object" }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Groq Vision API Error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices[0].message.content;

                try {
                    const json = parseGroqJSON(content);
                    // Handle different potential implementations of JSON return (array vs object wrapper)
                    resolve(Array.isArray(json) ? json : (json.events || json.data || []));
                } catch (parseError) {
                    console.error("JSON Parse Error:", parseError, content);
                    reject(new Error("Failed to parse syllabus data from AI response"));
                }

            } catch (error) {
                console.error("Groq Vision Error:", error);
                reject(error);
            }
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Analyzes student progress using the "Weekly Learning Analyzer" persona.
 */
export async function analyzeProgress(events, tasks, userProfile) {
    const prompt = `
    You are a learning analyst for StudentOS.
    Input:
    - Recent Schedule: ${JSON.stringify(events?.slice(0, 20) || [])}
    - Recent Tasks: ${JSON.stringify(tasks?.slice(0, 20) || [])}
    - Student Profile/Goals: ${userProfile || "General Student (Good Grades, Internship)"}

    Tasks:
    1. Calculate and explain briefly:
       - Academic focus score (0–100)
       - Career focus score (0–100)
       - Personal brand activity score (0–100)
    2. Detect weak zones (subjects, topics, or goals that are ignored).
    3. Suggest 3–7 concrete actions for the next 7 days.

    Output JSON:
    {
      "scores": { "academic": 0, "career": 0, "brand": 0 },
      "weak_zones": ["Subject X", "Goal Y"],
      "next_7_days_actions": ["Action 1", "Action 2"],
      "motivational_summary": "Short and specific motivational message (2-3 lines)."
    }
    `;

    console.log("Starting Analysis with events:", events?.length);
    try {
        const completion = await getGroqCompletion(prompt);
        console.log("Analysis Completion Received");
        const content = completion.choices[0]?.message?.content || "{}";
        return parseGroqJSON(content);
    } catch (e) {
        console.error("Analysis Error inside groq.js:", e);
        throw e;
    }
}

/**
 * Generates a Growth Plan (Ghost Events).
 */
export async function generateGrowthPlan(schedule, goals, platformData) {
    const prompt = `
    You are a growth planner for a student using StudentOS.
    Input:
    - Schedule (Next 7 days): ${JSON.stringify(schedule || [])}
    - Platform Stats: ${JSON.stringify(platformData || { github: "Active", linkedin: "Active" })}
    - Goals: ${goals || "Internship, 1k Followers, High Grades"}

    Tasks:
    1. Find 3–5 free time blocks in the upcoming 7 days best suited for:
       - Deep study
       - Portfolio/project work
       - Social/content posting
    2. Propose concrete actions for each block.

    Output JSON:
    {
      "ghost_events": [
        {
          "title": "Build Portfolio Feature",
          "description": "Implement the specific feature X...",
          "platform": "GitHub",
          "estimated_duration": "2 hours",
          "urgency_level": "High",
          "reason_why_it_helps": "Directly impacts internship portfolio.",
          "start_time": "YYYY-MM-DDTHH:MM:00" 
        }
      ]
    }
    `;

    const completion = await getGroqCompletion(prompt);
    const content = completion.choices[0]?.message?.content || "{}";
    const json = parseGroqJSON(content);
    return json.ghost_events || [];
}

/**
 * Organizes tasks using Anti-Overwhelm persona.
 */
export async function organizeTasks(tasks, events) {
    const prompt = `
    You are an AI time‑blocking assistant inside StudentOS (Anti-Overwhelm Mode).
    Input:
    - Raw Tasks: ${JSON.stringify(tasks || [])}
    - Upcoming Events (3 Days): ${JSON.stringify(events?.slice(0, 10) || [])}

    Tasks:
    1. Clean and categorize tasks into: 'urgent today', 'this week', 'later'.
    2. Suggest time blocks for the most important ones.
    3. Determine which tasks should be dropped or delayed if load is high.

    Output JSON:
    {
      "today_plan": [ { "id": "...", "title": "...", "start": "...", "end": "..." } ],
      "this_week": [ { "title": "..." } ],
      "can_drop_or_delay": [ { "title": "..." } ],
      "coaching_message": "Short 1-2 line coaching message."
    }
    `;

    const completion = await getGroqCompletion(prompt);
    const content = completion.choices[0]?.message?.content || "{}";
    return parseGroqJSON(content);
}

/**
 * Anti-Overwhelm Mode: breaks a big project into 30-min daily sessions.
 * @param {string} projectTitle  e.g. "GATE 2026 Preparation"
 * @param {string} deadline      ISO date string e.g. "2026-05-15"
 * @param {number} hoursPerDay   how many hours/day the student can study (default 2)
 */
export async function breakdownProject(projectTitle, deadline, hoursPerDay = 2) {
    const today = new Date().toISOString().split('T')[0];
    const sessionsPerDay = Math.floor((hoursPerDay * 60) / 30); // 30-min chunks

    const prompt = `
You are the Anti-Overwhelm Engine inside StudentOS.
A student is stressed about a big project and needs you to break it into achievable 30-minute daily sessions.

Project: "${projectTitle}"
Start Date: ${today}
Deadline: ${deadline}
Available study time: ${hoursPerDay} hours/day → ${sessionsPerDay} sessions of 30 min each per day

Instructions:
1. Identify the key topics/phases of this project (based on your knowledge of the subject).
2. Spread them across the available days as 30-minute sessions.
3. Front-load the harder topics (do hard things first when energy is high).
4. Include one review/revision day every 7 days.
5. Keep session titles specific and actionable (not "Study Chapter 1" but "Trees: BFS & DFS traversal practice").

Output ONLY valid JSON:
{
  "project": "${projectTitle}",
  "total_days": <number>,
  "total_sessions": <number>,
  "coaching_message": "A short, specific, motivating 2-line message.",
  "daily_plan": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "day_label": "Day 1 – Mon, 24 Feb",
      "sessions": [
        { "title": "Arrays – Two Pointer Technique", "duration": "30 min", "type": "learn" },
        { "title": "Arrays – Practice 5 problems", "duration": "30 min", "type": "practice" }
      ]
    }
  ]
}
Limit the plan to a maximum of 14 days shown (summarise the rest if deadline is further).
`;

    const completion = await getGroqCompletion(prompt);
    const content = completion.choices[0]?.message?.content || '{}';
    return parseGroqJSON(content);
}

/**
 * Burnout Auto-Rescuer: splits ONE stuck task into 4 ultra-specific 10-min micro-tasks.
 * @param {string} taskTitle  e.g. "Complete Math Assignment 3"
 * @returns {string[]}        Array of exactly 4 micro-task title strings
 */
export async function generateMicroTasks(taskTitle) {
    const prompt = `
You are the Anti-Gravity Engine inside StudentOS, a student productivity app.

A student has postponed the task "${taskTitle}" three days in a row and is clearly overwhelmed.
Break this ONE task into exactly 4 ultra-specific, achievable micro-tasks of 10 minutes each.

Rules:
- Each micro-task must start with an ACTION verb (Write, Solve, Read, Draw, List, Watch, etc.)
- Each micro-task should feel so small it creates ZERO resistance to start
- Tasks should follow a logical sequence (understand → apply → check → wrap-up)
- Keep each title under 12 words

Output ONLY a valid JSON array of exactly 4 strings:
["Micro-task 1", "Micro-task 2", "Micro-task 3", "Micro-task 4"]
`;

    const completion = await getGroqCompletion(prompt);
    const content = completion.choices[0]?.message?.content || '[]';

    try {
        const match = content.match(/\[[\s\S]*\]/);
        const parsed = match ? JSON.parse(match[0]) : [];
        return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch {
        // Fallback if AI returns garbage
        return [
            `Read what "${taskTitle}" actually requires (10 min)`,
            `Write the first 3 bullet points / steps`,
            `Complete just the first sub-section`,
            `Review, save progress, and close the tab`,
        ];
    }
}

/**
 * Hack Your Month Generator — produces a full personalized monthly challenge calendar.
 * @param {number} month   0-indexed (0=Jan … 11=Dec)
 * @param {number} year    e.g. 2026
 * @param {string} branch  e.g. "CSE", "ECE", "Mech"
 * @param {string[]} interests  e.g. ["AI/ML", "Hackathons"]
 * @returns {Object}  { "YYYY-MM-DD": { emoji, text, type }, … }
 */
export async function generateHackMonth(month, year, branch = 'Engineering', interests = []) {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = MONTHS[month];
    const interestStr = interests.length ? interests.join(', ') : 'general tech and career growth';

    const TYPES = ['apply', 'learn', 'network', 'create', 'compete', 'reflect', 'rest'];

    const prompt = `
You are the StudentOS Hack-Your-Month engine.
Generate a personalized daily challenge calendar for a ${branch} student
interested in ${interestStr}, for ${monthName} ${year} (${daysInMonth} days).

Rules:
- One short challenge per day (max 10 words), starting with an ACTION VERB
- Spread types evenly: apply, learn, network, create, compete, reflect, rest
- Weekends (Sat, Sun) should often be "rest" or "reflect"
- Make challenges realistic, specific, and student-friendly
- Add 1 relevant emoji per entry

Return ONLY a valid JSON object where keys are dates "YYYY-MM-DD":
{
  "${year}-${String(month + 1).padStart(2, '0')}-01": { "emoji": "🎯", "text": "Set 3 goals for ${monthName}", "type": "reflect" },
  "${year}-${String(month + 1).padStart(2, '0')}-02": { "emoji": "💼", "text": "Apply to 1 internship today", "type": "apply" }
}
Include ALL ${daysInMonth} days from 01 to ${String(daysInMonth).padStart(2, '0')}.
Output ONLY the JSON, no explanation.
`;

    const completion = await getGroqCompletion(prompt);
    const content = completion.choices[0]?.message?.content || '{}';

    try {
        // Extract the JSON object from the response
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found');
        return JSON.parse(match[0]);
    } catch {
        return {};   // Caller handles the empty state
    }
}

/**
 * Student Recovery Engine (Backlog Rescue Mode)
 * Takes a list of overdue tasks and generates a calm, 5-day recovery plan.
 * @param {Array} overdueTasks 
 * @returns {Object} Unpacked plan with new assigned dates
 */
export async function generateRescuePlan(overdueTasks) {
    const today = new Date();
    // Generate the next 5 days
    const next5Days = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    const prompt = `
You are the Student Recovery Engine inside StudentOS.
Your job is to rescue a student who is completely overwhelmed with overdue tasks.

Input:
- Overdue Tasks: ${JSON.stringify(overdueTasks.map(t => ({ id: t.id, title: t.title, originalDate: t.date })))}
- Recovery Window (Next 5 Days): ${JSON.stringify(next5Days)}

Objective:
1. Re-distribute these overdue tasks across the Recovery Window.
2. DO NOT put all tasks on day 1. Spread them out evenly so the student doesn't feel overwhelmed.
3. Group related tasks if possible.
4. Keep the original task IDs so we can update the database.

Output ONLY a valid JSON object matching this schema exactly:
{
  "coaching_message": "A short, extremely empathetic 2-line message telling them it's normal to fall behind and this plan will easily get them back on track.",
  "rescue_plan": [
    {
      "id": "task123",
      "title": "Module 3 Physics",
      "new_date": "2026-03-31",
      "rationale": "Moved to tomorrow so you can focus purely on Math today."
    }
  ],
  "can_drop_or_ignore": [
    { "id": "task456", "title": "Optional reading" }
  ]
}
If a task seems completely irrelevant or redundant given it's overdue, put it in can_drop_or_ignore. Otherwise distribute them all.
`;

    try {
        const completion = await getGroqCompletion(prompt);
        const content = completion.choices[0]?.message?.content || '{}';
        return parseGroqJSON(content);
    } catch {
        // Fallback: Just dump them to tomorrow if AI fails
        return {
            coaching_message: "We hit a snag, so I simply pushed everything to tomorrow. Take a deep breath!",
            rescue_plan: overdueTasks.map(t => ({ id: t.id, title: t.title, new_date: next5Days[1] })),
            can_drop_or_ignore: []
        };
    }
}
/**
 * Generates a Universal Micro Mission to rescue a streak.
 */
export async function generateMissionRescueChallenge(goal = "Daily Success", category = "General Productivity") {
    const prompt = `
You are the Mission Recovery Engine inside StudentOS.
The student missed their mission: "${goal}".
They need a quick "Rescue Challenge" to save their streak.

Generate a tiny, interesting challenge that takes no more than 5 minutes.
The challenge should be loosely related to focus, organization, or the spirit of "${goal}".

Output ONLY a valid JSON object:
{
  "title": "A catchy mission name (e.g., The 2-Minute Inbox Purge)",
  "description": "Short explanation of what to do (1-2 sentences).",
  "challenge_content": "The actual task or puzzle (e.g., 'Find 3 unread emails and archive them' or a logic riddle).",
  "solution_hint": "A small tip to help them complete it.",
  "category": "${category}",
  "coaching_message": "A 1-line motivating productivity-vibe message."
}
`;

    try {
        const completion = await getGroqCompletion(prompt);
        const content = completion.choices[0]?.message?.content || '{}';
        return parseGroqJSON(content);
    } catch {
        return {
            title: "Quick Reset",
            description: "Clear your workspace of 3 unnecessary items.",
            challenge_content: "Remove 3 things from your desk or digital desktop that you don't need right now.",
            solution_hint: "Physical clutter is mental clutter!",
            category: "Environment",
            coaching_message: "A clean space is a focused mind!"
        };
    }
}
/**
 * Parse Swayam syllabus/about text to extract weeks and deadlines.
 */
export async function parseSwayamSyllabus(text) {
    const prompt = `
    You are the StudentOS AI Course Parser.
    Extract the number of weeks and assignment deadlines from this Swayam course description/syllabus.
    
    Text: "${text}"
    
    Reference Semester: Jan-Apr 2026 (Starts approx Jan 19).
    
    Rules:
    1. Identify EXACTLY how many weeks/modules are in the course (e.g., 4, 8, or 12).
    2. Create ONE assignment object per week.
    3. Estimate deadlines based on a weekly rhythm (usually Tuesdays) starting from Jan 19, 2026, UNLESS specific dates are mentioned in the text.
    4. Include "Exam Fee Registration" (Feb 16, 2026) and "Final Exam" (Late April 2026).
    
    Output ONLY valid JSON:
    [
      { "courseName": "extracted name", "weekNumber": "Assignment Week 1", "lastDate": "2026-01-27", "type": "swayam_assignment" },
      ...
    ]
    `;

    try {
        const completion = await getGroqCompletion(prompt);
        const content = completion.choices[0]?.message?.content || "[]";
        return parseGroqJSON(content);
    } catch (e) {
        console.error("Syllabus Parse Error:", e);
        throw e;
    }
}
