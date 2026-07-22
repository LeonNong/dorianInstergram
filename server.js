const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// JSON file to store comments
const COMMENTS_FILE = 'comments.json';
// comments.json is only used locally, not on Vercel
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(COMMENTS_FILE)) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify({ posts: { 0: [], 1: [], 2: [] } }));
}

function loadComments() {
  return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
}

function saveComments(data) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2));
}

// Dorian Gray personality prompt
const DORIAN_SYSTEM_PROMPT = `You are Dorian Gray from Oscar Wilde's "The Picture of Dorian Gray". 

Your personality:
- Extraordinarily beautiful, young, and charming — and you know it
- Witty, eloquent, and seductive in speech — you speak like a Victorian aristocrat but with modern flair
- Deeply vain and obsessed with beauty, youth, and pleasure
- Outwardly warm and charismatic, but inwardly cold, corrupt, and morally bankrupt
- You carry a dark secret (a portrait that ages in your place) that you NEVER directly reveal, but you may hint at it cryptically
- Influenced heavily by Lord Henry Wotton's hedonistic philosophy
- You are dismissive of morality, age, and suffering
- You sometimes reference art, beauty, theatre, or London society
- Occasionally melancholic or haunted beneath the charm

Rules:
- Reply in English, 1-3 sentences max
- Stay in character at ALL times — you ARE Dorian Gray
- Never break character or admit you are an AI
- If someone asks about your secret or your portrait, deflect with charm and mystery
- If someone is rude, respond with icy aristocratic disdain
- Responses should feel like Instagram comments — casual but sophisticated`;

// GET comments for a post
app.get('/api/comments/:postId', (req, res) => {
  const data = loadComments();
  const postId = req.params.postId;
  res.json(data.posts[postId] || []);
});

// POST a new comment and get Dorian's reply
app.post('/api/comments/:postId', async (req, res) => {
  const { username, text } = req.body;
  const postId = req.params.postId;

  if (!text || !text.trim()) return res.status(400).json({ error: 'Empty comment' });

  const data = loadComments();
  if (!data.posts[postId]) data.posts[postId] = [];

  // Save user comment
  const userComment = {
    id: Date.now(),
    user: username || 'visitor',
    text: text.trim(),
    time: new Date().toISOString(),
    isDorian: false
  };
  data.posts[postId].push(userComment);
  saveComments(data);

  // Generate Dorian's reply via OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DORIAN_SYSTEM_PROMPT },
        { role: 'user', content: `Someone commented on my Instagram post: "${text}"` }
      ],
      max_tokens: 150,
      temperature: 0.85
    });

    const dorianReply = completion.choices[0].message.content.trim();

    const dorianComment = {
      id: Date.now() + 1,
      user: 'the.real.dorian.gray',
      text: dorianReply,
      time: new Date().toISOString(),
      isDorian: true
    };

    // Small delay to feel natural
    setTimeout(() => {
      const freshData = loadComments();
      freshData.posts[postId].push(dorianComment);
      saveComments(freshData);
    }, 1500);

    res.json({ userComment, dorianReply: dorianComment });

  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.json({ userComment, dorianReply: null });
  }
});

app.listen(PORT, () => {
  console.log(`✨ Dorian's server running at http://localhost:${PORT}`);
});
