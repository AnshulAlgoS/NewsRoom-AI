export interface AIProcessResponse {
  response: string;
  dailyPlanConfirmed?: boolean;
  profileUpdates?: {
    semester?: number;
    achievements?: string[];
    bio?: string;
  };
  todoUpdates?: {
    text: string;
    category: "dsa" | "project" | "learning" | "other";
  }[];
  progressUpdates?: {
    semesterProgress?: number;
  };
}

export const processUserChat = async (
  message: string,
  currentProfile: any
): Promise<AIProcessResponse> => {
  try {
    const recentHistory = currentProfile.chatHistory 
      ? currentProfile.chatHistory.slice(-5).map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
      : "No recent history";

    const systemPrompt = `You are NewsDesk AI, an editorial workflow assistant. Help with reporting plans, source checks, interviews and follow-up tasks. Never fabricate facts, citations or completed work. Do not publish anything. Legacy task category IDs map to: dsa = verification, project = reporting, learning = research, other = coordination. Legacy semester means planning cycle. Use these IDs in JSON for compatibility.
    
    Current Date: ${new Date().toLocaleDateString('en-CA')}
    Current Profile Context:
    ${JSON.stringify(currentProfile, null, 2)}
    
    Recent Conversation:
    ${recentHistory}

    Instructions:
    1. Check 'dailyPlanStatus' in the context.
       - If 'dailyPlanStatus.date' matches Current Date AND 'dailyPlanStatus.isConfirmed' is true:
         - The plan is LOCKED. Do NOT generate 'todoUpdates'.
         - If user tries to add tasks, politely say "Your daily plan is set for today. You can manually add tasks if needed."
    
    2. Analyze the user's input for:
       - Only include fields explicitly changed by the user. Omit unchanged fields; never return null placeholders.
       - Planning cycle changes (stored as semester)
       - Achievements (e.g., "completed a reporting assignment")
       - Goals/Plans (e.g., "planning source verification")
       - Daily Tasks (ONLY if plan is NOT locked):
         - CRITICAL: Extract EXACT intent. Do NOT hallucinate.
         - If user says "linked list", do NOT say "arrays".
         - Format: short and actionable (max 6-8 words).
         - CATEGORY RULES: Use ONLY: "dsa", "project", "learning", "other".
         - Examples:
           - "verify interview sources" -> { "text": "Verify interview sources", "category": "dsa" }
       - Confirmation:
         - If user says "looks good", "yes", "confirm" regarding the plan:
           - Return "dailyPlanConfirmed": true.
           - DO NOT generate 'todoUpdates' unless the user explicitly asks to ADD/CHANGE tasks in the same message.
           - If confirming PREVIOUSLY proposed tasks, just lock the plan.
           - Respond: "Great! Plan locked for today."

    3. Return JSON:
    {
      "response": "User-facing message",
      "dailyPlanConfirmed": boolean,
      "profileUpdates": { "semester": number, "achievements": [], "bio": "..." },
      "todoUpdates": [{ "text": "...", "category": "dsa" }],
      "progressUpdates": { "semesterProgress": number }
    }
    
    IMPORTANT: Return ONLY the JSON. No markdown formatting.`;

    const data = await safeChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      "nvidia/nemotron-3.5-super-vl-120b-a12b",
      { 
        temperature: 0.2, 
        max_tokens: 1024, 
        response_format: { type: "json_object" } 
      }
    );

    const content = data.choices[0]?.message?.content || "{}";
    
    // Clean content (remove <think> tags if present)
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (cleanContent.includes("<think>")) cleanContent = cleanContent.split("<think>")[0].trim();
    
    try {
      const parsed = JSON.parse(cleanContent);
      if (!parsed || typeof parsed.response !== "string" || !parsed.response.trim()) {
        throw new Error("AI returned an empty chat reply");
      }
      if (parsed.todoUpdates && !Array.isArray(parsed.todoUpdates)) delete parsed.todoUpdates;
      if (parsed.todoUpdates) parsed.todoUpdates = parsed.todoUpdates.filter(
        (todo: { text?: unknown } | null) => todo && typeof todo.text === "string" && todo.text.trim()
      );
      const planLocked = currentProfile.dailyPlanStatus?.isConfirmed === true &&
        currentProfile.dailyPlanStatus.date === new Date().toLocaleDateString('en-CA');
      if (planLocked) delete parsed.todoUpdates;
      if (parsed.profileUpdates) {
        const updates = parsed.profileUpdates;
        parsed.profileUpdates = {
          ...(Number.isInteger(updates.semester) && updates.semester > 0 && updates.semester <= 20 ? { semester: updates.semester } : {}),
          ...(typeof updates.bio === "string" ? { bio: updates.bio } : {}),
          ...(Array.isArray(updates.achievements) ? { achievements: updates.achievements.filter((a: unknown) => typeof a === "string") } : {})
        };
      }
      if (parsed.dailyPlanConfirmed !== true) delete parsed.dailyPlanConfirmed;
      if (parsed.progressUpdates && (typeof parsed.progressUpdates.semesterProgress !== "number" ||
        parsed.progressUpdates.semesterProgress < 0 || parsed.progressUpdates.semesterProgress > 100)) {
        delete parsed.progressUpdates;
      }
      
      // Sanitize categories to ensure they match valid types
      if (parsed.todoUpdates && Array.isArray(parsed.todoUpdates)) {
        const validCategories = ["dsa", "project", "learning", "other"];
        parsed.todoUpdates = parsed.todoUpdates.map((todo: any) => {
          let category = typeof todo.category === "string" ? todo.category.toLowerCase() : "other";
          
          // Heuristic correction if category is wrong or generic
          if (!validCategories.includes(category)) {
             // Try to infer from text
             const text = todo.text.toLowerCase();
             if (text.includes("dsa") || text.includes("leetcode") || text.includes("problem") || text.includes("linked list") || text.includes("array")) category = "dsa";
             else if (text.includes("project") || text.includes("hackathon") || text.includes("build") || text.includes("implement")) category = "project";
             else if (text.includes("study") || text.includes("learn") || text.includes("watch") || text.includes("read")) category = "learning";
             else category = "other";
          }
          
          return {
            ...todo,
            category
          };
        });
      }

      return parsed;
    } catch (e) {
      console.error("Failed to parse AI JSON response", e);
      return { response: "I processed your request but had trouble updating the dashboard automatically. Could you say that again?" };
    }

  } catch (error) {
    console.error("Error processing user chat:", error);
    return { response: "I'm having trouble connecting to my brain right now. Please try again later." };
  }
};

export const generateQuestions = async (role: string) => {
  try {
    const data = await safeChatCompletion(
      [
        { role: "system", content: "You are a friendly but professional editorial mentor in a newsroom workspace. Your goal is to ask 1 insightful, specific, and open-ended question to a user with the role of '" + role + "' to help them showcase their best achievements. The question should be conversational and encouraging. Do not include any internal monologue or thinking process in the output. Return ONLY the question text." },
      ],
      "nvidia/nemotron-3.5-super-vl-120b-a12b",
      { temperature: 0.7, max_tokens: 1024 }
    );
    const content = data.choices[0]?.message?.content || "";
    // Robustly remove <think> tags, even if unclosed or malformed
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    // Fallback: if <think> exists but no closing tag (rare with high tokens), remove everything from <think> onwards
    if (cleanContent.includes("<think>")) {
      cleanContent = cleanContent.split("<think>")[0].trim();
    }
    
    // If the content is empty after cleaning (model only output thoughts), return default
    if (!cleanContent) return "What are the key projects or achievements you are most proud of in this role?";
    
    // Remove any surrounding quotes if present
    return cleanContent.replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error("Error generating question:", error);
    return "What are the key projects you have worked on?";
  }
};

export interface ComparisonResult {
  score: number;
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
  verdict: string;
  detailedAnalysis?: string;
}

export const compareResumeWithJD = async (
  resumeText: string,
  jdText: string,
  userContext?: string,
  customInstructions?: string
): Promise<ComparisonResult> => {

  try {
    const systemPrompt = `You are an editorial development assistant for a newsroom research workspace.
Compare the supplied journalist portfolio against a reporting beat or reference profile.
Use only supplied evidence. Identify reporting, verification, data literacy, interviewing and editorial workflow capabilities.
Do not infer sensitive attributes, fabricate bylines or sources, decide hiring, or claim that an unverified article is factual.
The score is a non-calibrated profile-to-brief coverage heuristic, not a hiring recommendation or journalism quality rating.
Return JSON only: {"score":number from 0 to 100,"missingSkills":string[],"strengths":string[],"improvements":string[],"verdict":string,"detailedAnalysis":string}.
Detailed analysis must cover evidence available, gaps in the reporting brief, source-verification requirements and practical next steps.
${userContext ? `Additional user-supplied context: ${userContext}` : ""}
${customInstructions ? `Review focus: ${customInstructions}` : ""}`;

    const data = await safeChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `JOURNALIST PROFILE:\n${resumeText}\n\nREPORTING BRIEF / REFERENCE PROFILE:\n${jdText}` }
      ],
      "nvidia/nemotron-3.5-super-vl-120b-a12b",
      { 
        temperature: 0.2, 
        max_tokens: 2048, 
        response_format: { type: "json_object" } 
      }
    );

    const content = data.choices[0]?.message?.content || "{}";
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (cleanContent.includes("<think>")) cleanContent = cleanContent.split("<think>")[0].trim();

    const result = JSON.parse(cleanContent);
    if (
      !result || typeof result.score !== "number" || !Number.isFinite(result.score) || result.score < 0 || result.score > 100 ||
      !Array.isArray(result.missingSkills) || !Array.isArray(result.strengths) ||
      !Array.isArray(result.improvements) || typeof result.verdict !== "string"
    ) {
      throw new Error("AI returned an incomplete comparison. Please retry.");
    }
    return result;
  } catch (error) {
    console.error("Error comparing resume:", error);
    throw error instanceof Error ? error : new Error("Unable to analyze resumes. Please retry.");
  }
};

const safeChatCompletion = async (messages: any[], model: string, options: any = {}) => {
  const response = await fetch('/api/nvidia/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({model, messages, temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 1024, response_format: options.response_format,
      chat_template_kwargs: {enable_thinking: false}})
  });
  if (!response.ok) throw new Error(`AI service unavailable (${response.status}). Please retry.`);
  return response.json();
};

export const expandProfileWithAI = async (
  input: string, 
  type: "current" | "target", 
  contextAnswers?: { question: string, answer: string }[]
) => {
  let systemPrompt = "";
  let userContent = input;

  if (type === "current") {
    systemPrompt = "You are a journalist portfolio assistant. Use supplied evidence only. Analyze the user's current role and their answers to interview questions. Generate a CONCISE professional profile summary (max 150 words). Format it with:\n- A brief 1-sentence opening summary\n- A bulleted list of 3-4 Key Strengths (using **Bold** for headers)\n- A short closing sentence on their potential.\nReturn ONLY the formatted summary.";
    if (contextAnswers) {
      userContent += "\n\nAdditional Context:\n" + contextAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n");
    }
  } else {
    systemPrompt = "You are a career strategist. Analyze the user's target role and their specific goals. Generate a CONCISE target role analysis (max 150 words). Format it with:\n- A bulleted list of 3-4 Key Requirements (using **Bold** for headers)\n- A bulleted list of 3-4 Necessary Skills\n- 1 sentence on Typical Achievements.\nReturn ONLY the formatted analysis.";
     if (contextAnswers) {
      userContent += "\n\nAdditional Context:\n" + contextAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n");
    }
  }

  try {
    const data = await safeChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      "nvidia/nemotron-3.5-super-vl-120b-a12b",
      { temperature: 0.6, top_p: 0.95 }
    );

    const content = data.choices[0]?.message?.content || "";
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (cleanContent.includes("<think>")) cleanContent = cleanContent.split("<think>")[0].trim();
    
    return cleanContent || "Unable to generate AI profile. Please try again.";
  } catch (error) {
    console.error("Error expanding profile with AI:", error);
    return `Unable to generate AI profile at this time. (Error: ${error instanceof Error ? error.message : "Unknown"})`;
  }
};

export const generateDailyPlan = async (userProfile: any) => {
  try {
    const systemPrompt = `You are an editorial planning assistant. Generate source checks, reporting, research and coordination tasks. Use legacy category IDs dsa, project, learning and other respectively. Do not invent sources, publication results or completed work.
    Based on the user's profile, generate a focused daily plan.
    
    User Context:
    - Current Role: ${userProfile.currentRole || "Student"}
    - Target Role: ${userProfile.targetRole || "Data journalist"}
    - Semester: ${userProfile.semester || 1}
    - Skills: ${userProfile.skills?.join(", ") || "General"}
    - Aspirations: ${userProfile.aspirations?.join(", ") || "Growth"}

    Output STRICT JSON ONLY:
    {
      "dailyFocus": "A short, motivating 1-sentence focus for today.",
      "todos": [
        { "text": "Specific actionable task 1 (max 6 words)", "category": "dsa" },
        { "text": "Specific actionable task 2 (max 6 words)", "category": "project" },
        { "text": "Specific actionable task 3 (max 6 words)", "category": "learning" }
      ],
      "coachMessage": "A short, encouraging tip from a friendly AI coach."
    }`;

    const data = await safeChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate my daily plan." }
      ],
      "nvidia/nemotron-3.5-super-vl-120b-a12b",
      { 
        temperature: 0.7, 
        max_tokens: 1024, 
        response_format: { type: "json_object" } 
      }
    );

    const content = data.choices[0]?.message?.content || "{}";
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (cleanContent.includes("<think>")) cleanContent = cleanContent.split("<think>")[0].trim();
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("Error generating daily plan:", error);
    return null;
  }
};
