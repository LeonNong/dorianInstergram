const API = '/api/comments';

const posts = [
  {
    img: 'Instagram_files/501459026_18270975967278413_2525491125612420476_n.jpg',
    fallback: '🥂',
    caption: '<strong>the.real.dorian.gray</strong> Another night, another room full of people who\'ll never truly know me. ✨🥂 And I wouldn\'t have it any other way.<br/><span class="hashtags">#HighSociety #London #NeverBoring #LordHenryTaughtMe #Untouchable</span>',
    likes: 7103,
    time: '3天前'
  },
  {
    img: 'Instagram_files/503894269_715399024326390_8311297579143623993_n.jpg',
    fallback: '🖼️',
    caption: '<strong>the.real.dorian.gray</strong> Some things are better kept hidden. 🖼️🔒 Beauty is the only thing worth having, and I intend to keep it.<br/><span class="hashtags">#ForeverYoung #ThePortrait #MyBestSelf #HiddenTruths #DoNotEnter</span>',
    likes: 4821,
    time: '1周前'
  },
  {
    img: 'Instagram_files/504358032_18273822289278413_2535619005380173148_n.jpg',
    fallback: '🪞',
    caption: '<strong>the.real.dorian.gray</strong> They say beauty fades. Mine hasn\'t. Funny how that works. 😌 Years pass. I don\'t.<br/><span class="hashtags">#Ageless #StillMe #NoFilter #WhatIsMySecret #YouWouldntUnderstand</span>',
    likes: 11450,
    time: '2周前'
  }
];

let currentPost = 0;
let likedPosts = {};

// Ask for username on load
let visitorName = localStorage.getItem('dorianVisitorName');
if (!visitorName) {
  visitorName = prompt('Enter your username to interact with Dorian:') || 'visitor';
  localStorage.setItem('dorianVisitorName', visitorName);
}

// Follow toggle
document.getElementById('followBtn').addEventListener('click', function () {
  if (this.textContent === 'Follow') {
    this.textContent = 'Following';
    this.classList.add('following');
  } else {
    this.textContent = 'Follow';
    this.classList.remove('following');
  }
});

// Tab switch
function switchTab(el, id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.grid-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// Open post modal
async function openPost(index) {
  currentPost = index;
  const post = posts[index];
  const overlay = document.getElementById('modalOverlay');
  const img = document.getElementById('modalImg');
  const fallback = document.getElementById('modalImgFallback');

  img.src = post.img;
  img.style.display = 'block';
  fallback.style.display = 'none';
  fallback.textContent = post.fallback;
  img.onerror = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };

  document.getElementById('modalCaption').innerHTML = post.caption;
  updateModalLike();
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Load comments from server
  await loadComments(index);
}

async function loadComments(postId) {
  const commentsEl = document.getElementById('modalComments');
    commentsEl.innerHTML = '<div class="loading-comments">Loading comments...</div>';

  try {
    const res = await fetch(`${API}/comments/${postId}`);
    const comments = await res.json();
    renderComments(comments);
  } catch {
    // Fallback static comments if server is down
    renderComments([
      { user: 'basilhallward_art', text: 'Dorian, please… that painting was made with love. 💔', isDorian: false },
      { user: 'lordhenrywotton', text: 'Wise move, my dear boy. 😏', isDorian: false },
    ]);
  }
}

function renderComments(comments) {
  const commentsEl = document.getElementById('modalComments');
  if (comments.length === 0) {
    commentsEl.innerHTML = '<div class="no-comments">Be the first to comment...</div>';
    return;
  }
  commentsEl.innerHTML = comments.map(c => `
    <div class="modal-comment ${c.isDorian ? 'dorian-reply' : ''}">
      ${c.isDorian ? '<span class="dorian-badge">✦</span>' : ''}
      <strong>${c.user}</strong>
      <span>${c.text}</span>
    </div>
  `).join('');
  commentsEl.scrollTop = commentsEl.scrollHeight;
}

function updateModalLike() {
  const post = posts[currentPost];
  const liked = likedPosts[currentPost];
  document.getElementById('modalLikeBtn').textContent = liked ? '❤️' : '🤍';
  document.getElementById('modalLikes').textContent = (post.likes + (liked ? 1 : 0)).toLocaleString() + ' likes';
}

function toggleModalLike() {
  likedPosts[currentPost] = !likedPosts[currentPost];
  updateModalLike();
}

function closePostModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closePostModal();
}

// Submit comment — sends to server, Dorian replies
async function submitComment(e) {
  if (e.key !== 'Enter') return;
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;

  const commentsEl = document.getElementById('modalComments');

  // Show user's comment immediately
  const userDiv = document.createElement('div');
  userDiv.className = 'modal-comment';
  userDiv.innerHTML = `<strong>${visitorName}</strong><span>${text}</span>`;
  commentsEl.appendChild(userDiv);
  commentsEl.scrollTop = commentsEl.scrollHeight;

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'modal-comment dorian-reply typing';
  typingDiv.innerHTML = `<span class="dorian-badge">✦</span><strong>the.real.dorian.gray</strong><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
  commentsEl.appendChild(typingDiv);
  commentsEl.scrollTop = commentsEl.scrollHeight;

  try {
    const res = await fetch(`${API}/comments/${currentPost}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: visitorName, text })
    });
    const data = await res.json();

    // Replace typing indicator with Dorian's reply
    if (data.dorianReply) {
      setTimeout(() => {
        typingDiv.classList.remove('typing');
        typingDiv.innerHTML = `<span class="dorian-badge">✦</span><strong>the.real.dorian.gray</strong><span>${data.dorianReply.text}</span>`;
        commentsEl.scrollTop = commentsEl.scrollHeight;
      }, 1800);
    } else {
      typingDiv.remove();
    }
  } catch {
    typingDiv.remove();
  }

  input.disabled = false;
  input.focus();
}

// Story
function openStory(name) {
  const icons = { 'The Portrait': '🖼️', 'Nights Out': '🥂', 'Sibyl': '🌹', 'Society': '🎭', 'China': '🏮', 'Italy': '🇮🇹' };
  document.getElementById('storyContent').textContent = icons[name] || '✨';
  document.getElementById('storyOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(closeStory, 4000);
}

function closeStory() {
  document.getElementById('storyOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// Sidebar nav
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function () {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});
