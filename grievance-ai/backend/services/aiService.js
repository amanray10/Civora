// ------------------------------------------------------------------
// Ollama AI service
//   - analyzeComplaint : category, department, priority, summary, duplicate
//   - chatbotReply     : citizen-help chatbot
// Falls back to keyword heuristics if Ollama is unreachable, so the
// demo never breaks.
// ------------------------------------------------------------------
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';

async function ollamaJSON(prompt) {
  const { data } = await axios.post(
    `${OLLAMA_URL}/api/generate`,
{ model: MODEL, prompt, format: 'json', stream: false, keep_alive: '60m', options: { temperature: 0.1 } },
{ timeout: 180000 }
  );
  return JSON.parse(data.response);
}

async function ollamaText(prompt) {
  const { data } = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    { model: MODEL, prompt, stream: false, keep_alive: '180m', options: { temperature: 0.4 } },
    { timeout: 180000 }
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
  "summary": one crisp sentence (max 25 words) for administrators,
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
    console.warn('[aiService] Ollama unavailable, using heuristic fallback:', err.message);
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

// ------------------- heuristic fallback -------------------
const KEYWORDS = [
  { cat: 'Gas Safety',  pri: 'Critical', dept: /gas|fire/i,        words: /gas leak|fire|explosion|smoke/i },
  { cat: 'Electricity', pri: 'High',     dept: /electric/i,        words: /electric|street ?light|power|transformer|wire/i },
  { cat: 'Water',       pri: 'High',     dept: /water/i,           words: /water|pipeline|leakage|sewage overflow|tap/i },
  { cat: 'Sanitation',  pri: 'Medium',   dept: /sanitation/i,      words: /garbage|trash|waste|clean|drain|toilet/i },
  { cat: 'Roads',       pri: 'Medium',   dept: /road|infra/i,      words: /pothole|road|footpath|bridge|traffic signal/i },
  { cat: 'Health',      pri: 'High',     dept: /health/i,          words: /mosquito|dengue|hospital|stray|epidemic/i },
  { cat: 'Environment', pri: 'Low',      dept: /park|environment/i,words: /tree|park|pollution|noise/i }
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

module.exports = { analyzeComplaint, chatbotReply };
