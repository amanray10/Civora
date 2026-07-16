// ------------------------------------------------------------------
// Ollama AI service
//   - analyzeComplaint    : category, department, priority, summary, duplicate
//   - chatbotReply        : citizen-help chatbot
//   - detectAndTranslate  : detect transliterated Hindi/Marathi and translate to English
//   - translateComplaint  : translate complaint title + description
// Falls back to keyword heuristics if Ollama is unreachable, so the
// demo never breaks.
// ------------------------------------------------------------------
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';
const REQUEST_TIMEOUT = Number(process.env.OLLAMA_TIMEOUT_MS || 300000);

function parseOllamaJson(responseText) {
  if (typeof responseText !== 'string') {
    throw new Error('Ollama response was not a string.');
  }

  const trimmed = responseText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(fenced);
    } catch {
      const match = fenced.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`Ollama returned non-JSON output: ${trimmed.slice(0, 200)}`);
    }
  }
}

async function ollamaJSON(prompt) {
  const { data } = await axios.post(
    `${OLLAMA_URL}/api/generate`,
{ model: MODEL, prompt, format: 'json', stream: false, keep_alive: '60m', options: { temperature: 0.1 } },
{ timeout: REQUEST_TIMEOUT }
  );
  return parseOllamaJson(data.response);
}

async function ollamaText(prompt) {
  const { data } = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    { model: MODEL, prompt, stream: false, keep_alive: '180m', options: { temperature: 0.4 } },
    { timeout: REQUEST_TIMEOUT }
  );
  return data.response.trim();
}

/**
 * @param {string} title
 * @param {string} description
 * @param {Array<{id:number, departmentName:string}>} departments
 * @param {Array<{id:number, title:string, summary:string, location:string}>} recent  open complaints to compare for duplicates
 */
async function analyzeComplaint(title, description, departments, recent) {
  const deptList = departments.map(d => `${d.id}: ${d.departmentName}`).join('\n');
  const recentList = recent.length
    ? recent.map(c => `#${c.id} | ${c.title} | ${c.summary || ''} | ${c.location || ''}`).join('\n')
    : 'none';

  const prompt = `You are the triage engine of a municipal grievance system.

IMPORTANT: The complaint text may be in transliterated Hindi or Marathi (Indian languages written in English/Roman script, e.g. "mere area mei pothole hai" means "there is a pothole in my area", "paani nahi aa raha" means "water is not coming", "bijli nahi hai" means "there is no electricity"). You MUST interpret the actual meaning regardless of language and analyze accordingly.

DEPARTMENTS (id: name):
${deptList}

RECENT OPEN COMPLAINTS (for duplicate check):
${recentList}

NEW COMPLAINT
Title: ${title}
Description: ${description}

Return ONLY a JSON object with exactly these keys:
{
  "category": one of ["Electricity","Water","Sanitation","Roads","Health","Gas Safety","Environment","Other"],
  "department_id": integer id of the best department from the list,
  "priority": one of ["Low","Medium","High","Critical"] (Critical = danger to life/safety),
  "summary": one crisp sentence IN ENGLISH (max 25 words) for administrators - translate if needed,
  "duplicate_of": integer id of a matching recent complaint about the SAME issue at the SAME place, or null,
  "duplicate_confidence": number 0 to 1
}`;

  try {
    const out = await ollamaJSON(prompt);
    return {
      category: out.category || 'Other',
      departmentId: departments.some(d => d.id === Number(out.department_id))
        ? Number(out.department_id) : fallbackDept(description, departments),
      priority: ['Low','Medium','High','Critical'].includes(out.priority) ? out.priority : 'Medium',
      summary: out.summary || title,
      duplicateId: out.duplicate_of && out.duplicate_confidence >= 0.75 ? Number(out.duplicate_of) : null,
      aiUsed: true
    };
  } catch (err) {
    console.warn('[aiService] Ollama triage failed, using heuristic fallback:', err.message);
    if (err.response?.data) {
      console.warn('[aiService] Ollama error payload:', err.response.data);
    }
    return heuristicAnalysis(title, description, departments);
  }
}

async function chatbotReply(question, historyPairs = []) {
  const history = historyPairs.map(h => `User: ${h.question}\nAssistant: ${h.answer}`).join('\n');
  const prompt = `You are the help assistant of a civic grievance portal. Citizens can: sign in with Google, submit complaints (title, description, location, photos), track live status (Submitted -> AI Processing -> Assigned -> Accepted -> In Progress -> Resolved -> Closed), and view history. AI automatically categorises complaints, assigns the right department, detects priority and merges duplicates. Answer briefly and helpfully in plain language.

${history ? history + '\n' : ''}User: ${question}
Assistant:`;
  try {
    return await ollamaText(prompt);
  } catch {
    return 'To register a complaint, sign in and open "New Complaint", describe the issue with its location, and submit — our AI will route it to the right department. You can watch live status under "My Complaints". (AI engine is offline right now, so this is a standard reply.)';
  }
}

// ------------------- transliteration detection -------------------

/**
 * Detect if text is transliterated Hindi/Marathi and translate to English.
 * @param {string} text
 * @returns {Promise<{detected:boolean, language:string|null, english:string, original:string}>}
 */
async function detectAndTranslate(text) {
  if (!text || !text.trim()) return { detected: false, language: null, english: text || '', original: text || '' };

  const safeText = text.replace(/"/g, '\\"');
  const prompt = 'You are a language detection and translation engine for an Indian civic grievance system.\n\nAnalyze the following text and determine if it is written in transliterated Hindi or Marathi (Indian languages written using English/Roman script). Examples:\n- "mere area mei pothole hai" -> Hindi (transliterated) -> "There is a pothole in my area"\n- "paani nahi aa raha hai" -> Hindi (transliterated) -> "Water is not coming"\n- "sadak kharab hai" -> Hindi (transliterated) -> "The road is in bad condition"\n- "kachra uthaya nahi gaya" -> Hindi (transliterated) -> "Garbage has not been picked up"\n- "ithe pani yet nahi" -> Marathi (transliterated) -> "Water is not coming here"\n- "rasta kharab aahe" -> Marathi (transliterated) -> "The road is bad"\n- "There is a pothole on my street" -> Already English, no translation needed\n\nText to analyze:\n"' + safeText + '"\n\nReturn ONLY a JSON object:\n{\n  "detected": true if the text is in transliterated Hindi/Marathi (even partially mixed with English), false if it is already in English,\n  "language": "Hindi" or "Marathi" or "Hindi-English Mix" or null (if already English),\n  "english": the full English translation of the text (if detected=true) OR the original text unchanged (if detected=false),\n  "original": the original text exactly as provided\n}';

  try {
    const result = await ollamaJSON(prompt);
    return {
      detected: !!result.detected,
      language: result.language || null,
      english: result.english || text,
      original: text
    };
  } catch (err) {
    console.warn('[aiService] Translation detection failed:', err.message);
    return heuristicTranslitDetect(text);
  }
}

/**
 * Translate both title and description of a complaint.
 * @param {string} title
 * @param {string} description
 * @returns {Promise<{title:{detected,language,english,original}, description:{detected,language,english,original}}>}
 */
async function translateComplaint(title, description) {
  const [titleResult, descResult] = await Promise.all([
    detectAndTranslate(title),
    detectAndTranslate(description)
  ]);
  return { title: titleResult, description: descResult };
}

// Simple heuristic check for common Hindi/Marathi transliterated words
const TRANSLIT_MARKERS = /\b(hai|nahi|mein|mei|mere|mera|karo|kya|yahan|wahan|bahut|kuch|aur|lekin|abhi|isko|usko|humara|hamara|aahe|nako|kaay|kahi|tyache|ithe|tithe|kela|zala|kami|jyada|bohot|bohut|acha|theek|kharab|bura|accha|pani|paani|bijli|sadak|sarak|gaddha|gandagi|nala|ped|machhar|aag|gutter|nali|naali)\b/i;

function heuristicTranslitDetect(text) {
  const detected = TRANSLIT_MARKERS.test(text);
  return {
    detected: detected,
    language: detected ? 'Hindi' : null,
    english: text,
    original: text
  };
}

// ------------------- heuristic fallback -------------------
const KEYWORDS = [
  { cat: 'Gas Safety',  pri: 'Critical', dept: /gas|fire/i,        words: /gas leak|fire|explosion|smoke|aag|gas risakna/i },
  { cat: 'Electricity', pri: 'High',     dept: /electric/i,        words: /electric|street ?light|power|transformer|wire|bijli|bijlee|light nahi|current nahi|batti/i },
  { cat: 'Water',       pri: 'High',     dept: /water/i,           words: /water|pipeline|leakage|sewage overflow|tap|paani|pani|nala|nal|naali|nali|jal|pani nahi/i },
  { cat: 'Sanitation',  pri: 'Medium',   dept: /sanitation/i,      words: /garbage|trash|waste|clean|drain|toilet|kachra|kachara|gandagi|safai|gutter|ganda/i },
  { cat: 'Roads',       pri: 'Medium',   dept: /road|infra/i,      words: /pothole|road|footpath|bridge|traffic signal|sadak|sarak|gaddha|gadda|rasta|khada|khadda/i },
  { cat: 'Health',      pri: 'High',     dept: /health/i,          words: /mosquito|dengue|hospital|stray|epidemic|machhar|machar|aspatal|bukhar|bimari|bimar/i },
  { cat: 'Environment', pri: 'Low',      dept: /park|environment/i,words: /tree|park|pollution|noise|ped|pedh|pradushan|shor|jungle|hara bhara/i }
];

function heuristicAnalysis(title, description, departments) {
  const text = `${title} ${description}`;
  const hit = KEYWORDS.find(k => k.words.test(text));
  const dept = hit ? departments.find(d => hit.dept.test(d.departmentName)) : null;
  const general = departments.find(d => /general/i.test(d.departmentName)) || departments[0];
  return {
    category: hit ? hit.cat : 'Other',
    departmentId: (dept || general)?.id || null,
    priority: hit ? hit.pri : 'Medium',
    summary: title.length > 120 ? title.slice(0, 117) + '...' : title,
    duplicateId: null,
    aiUsed: false
  };
}

function fallbackDept(description, departments) {
  return heuristicAnalysis('', description, departments).departmentId;
}

module.exports = { analyzeComplaint, chatbotReply, detectAndTranslate, translateComplaint };

