const { OpenAI } = require('openai');

const DORIAN_SYSTEM_PROMPT = `You are Dorian Gray from Oscar Wilde's "The Picture of Dorian Gray".

Your personality:
- Extraordinarily beautiful, young, and charming — and you know it
- Witty, eloquent, and seductive in speech — you speak like a Victorian aristocrat with modern flair
- Deeply vain and obsessed with beauty, youth, and pleasure
- Outwardly warm and charismatic, but inwardly cold, corrupt, and morally bankrupt
- You carry a dark secret (a portrait that ages in your place) — never reveal it directly, only hint cryptically
- Influenced by Lord Henry Wotton's hedonistic philosophy
- Dismissive of morality, age, and suffering
- Occasionally reference art, beauty, theatre, or London society
- Sometimes melancholic or haunted beneath the charm

Rules:
- Reply in English only, 1-3 sentences max
- Stay in character at ALL times — you ARE Dorian Gray, not an AI
- Never break character or admit you are an AI
- If asked about your secret or portrait, deflect with charm and mystery
- If someone is rude, respond with icy aristocratic disdain
- Responses feel like Instagram comments — casual but sophisticated`;

// In-memory store per serverless instance
const commentsStore = {};

const initialComments = {
  '0': [
    { id: 1, user: 'lordhenrywotton', text: "You've finally learned how to live, Dorian. Proud of you. 🍷", isDorian: false },
    { id: 2, user: 'basilhallward_art', text: 'I worry about you. Where are you going at this hour?', isDorian: false },
    { id: 3, user: 'james_vane__', text: 'Enjoy it while it lasts. 👀', isDorian: false }
  ],
  '1': [
    { id: 4, user: 'basilhallward_art', text: "Dorian, please… that painting was made with love. Don't lock it away. 💔", isDorian: false },
    { id: 5, user: 'lordhenrywotton', text: 'Wise move, my dear boy. Some masterpieces are too powerful for public display. 😏', isDorian: false },
    { id: 6, user: 'sibyljvane', text: 'I painted you in my heart too 🌹', isDorian: false }
  ],
  '2': [
    { id: 7, user: 'basilhallward_art', text: "Dorian… what have you done? You look exactly the same as 20 years ago.", isDorian: false },
    { id: 8, user: 'lordhenrywotton', text: 'Youth is a gift. Spend it recklessly. 😈', isDorian: false },
    { id: 9, user: 'sibyljvane', text: 'I used to think you were beautiful inside too. I was wrong. 💔', isDorian: false }
  ]
};

function getPostComments(postId) {
  const id = String(postId);
  if (!commentsStore[id]) commentsStore[id] = [];
  return [...(initialComments[id] || []), ...commentsStore[id]];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const postId = req.query.postId;

  // Health check
  if (req.method === 'GET' && !postId) {
    return res.json({ status: 'ok', hasKey: !!process.env.OPENAI_API_KEY });
  }

  if (req.method === 'GET') {
    return res.json(getPostComments(postId));
  }

  if (req.method === 'POST') {
    const { username, text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty comment' });

    const id = String(postId);
    if (!commentsStore[id]) commentsStore[id] = [];

    const userComment = {
      id: Date.now(),
      user: username || 'visitor',
      text: text.trim(),
      isDorian: false
    };
    commentsStore[id].push(userComment);

    // Check API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return res.json({ userComment, dorianReply: null, error: 'API key not configured' });
    }

    try {
      // Initialize OpenAI lazily inside handler
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: DORIAN_SYSTEM_PROMPT },
          { role: 'user', content: `Someone commented on my Instagram post: "${text}"` }
        ],
        max_tokens: 120,
        temperature: 0.85
      });

      const replyText = completion.choices[0].message.content.trim();
      const dorianComment = {
        id: Date.now() + 1,
        user: 'the.real.dorian.gray',
        text: replyText,
        isDorian: true
      };
      commentsStore[id].push(dorianComment);

      return res.json({ userComment, dorianReply: dorianComment });
    } catch (err) {
      console.error('OpenAI error:', err.message, err.status);
      return res.json({ userComment, dorianReply: null, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
