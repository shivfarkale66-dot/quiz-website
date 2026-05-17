// ============================================================
// CODEQUIZ PRO - Main Application Logic
// ============================================================

// ============ STATE ============
let APP = {
  currentUser: null,
  currentQuiz: {
    topic: null, questions: [], current: 0,
    answers: [], score: 0, timer: null,
    timeLeft: 30, startTime: null
  },
  adminView: 'dashboard'
};

// ============ DATABASE (localStorage) ============
const DB = {
  getUsers: () => JSON.parse(localStorage.getItem('cq_users') || '[]'),
  saveUsers: (u) => localStorage.setItem('cq_users', JSON.stringify(u)),
  getScores: () => JSON.parse(localStorage.getItem('cq_scores') || '[]'),
  saveScores: (s) => localStorage.setItem('cq_scores', JSON.stringify(s)),
  getCustomQ: () => JSON.parse(localStorage.getItem('cq_custom_q') || '[]'),
  saveCustomQ: (q) => localStorage.setItem('cq_custom_q', JSON.stringify(q)),

  init() {
    if (!this.getUsers().length) {
      this.saveUsers([
        { id: 'admin1', name: 'Admin', email: 'admin@quiz.com', password: 'admin123', role: 'admin', joined: new Date().toISOString() }
      ]);
    }
  },

  addScore(entry) {
    const scores = this.getScores();
    scores.unshift(entry);
    this.saveScores(scores.slice(0, 500));
  },

  getUserScores(userId) {
    return this.getScores().filter(s => s.userId === userId);
  },

  getUserBest(userId) {
    const sc = this.getUserScores(userId);
    return sc.length ? Math.max(...sc.map(s => s.percent)) : 0;
  }
};

// ============ PAGE NAVIGATION ============
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  window.scrollTo(0, 0);
}

// ============ AUTH ============
function initAuth() {
  document.getElementById('tab-login').onclick = () => switchTab('login');
  document.getElementById('tab-register').onclick = () => switchTab('register');
  document.getElementById('tab-admin').onclick = () => switchTab('admin');

  document.getElementById('btn-login').onclick = handleLogin;
  document.getElementById('btn-register').onclick = handleRegister;
  document.getElementById('btn-admin-login').onclick = handleAdminLogin;
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).style.display = 'block';
  clearAlert();
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) return showAlert('login', 'Saare fields bharo!', 'error');

  const users = DB.getUsers();
  const user = users.find(u => u.email === email && u.password === pass && u.role !== 'admin');
  if (!user) return showAlert('login', 'Email ya password galat hai!', 'error');

  loginSuccess(user);
}

function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const college = document.getElementById('reg-college').value.trim();

  if (!name || !email || !pass || !college) return showAlert('register', 'Saare fields bharo!', 'error');
  if (pass !== pass2) return showAlert('register', 'Passwords match nahi karte!', 'error');
  if (pass.length < 6) return showAlert('register', 'Password kam se kam 6 characters ka hona chahiye!', 'error');

  const users = DB.getUsers();
  if (users.find(u => u.email === email)) return showAlert('register', 'Ye email pehle se registered hai!', 'error');

  const user = { id: 'u' + Date.now(), name, email, password: pass, college, role: 'user', joined: new Date().toISOString() };
  users.push(user);
  DB.saveUsers(users);
  showAlert('register', 'Account ban gaya! Ab login karo.', 'success');
  setTimeout(() => switchTab('login'), 1500);
}

function handleAdminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const pass = document.getElementById('admin-pass').value;
  if (!email || !pass) return showAlert('admin', 'Saare fields bharo!', 'error');

  const users = DB.getUsers();
  const admin = users.find(u => u.email === email && u.password === pass && u.role === 'admin');
  if (!admin) return showAlert('admin', 'Admin credentials galat hain!', 'error');

  loginSuccess(admin);
}

function loginSuccess(user) {
  APP.currentUser = user;
  localStorage.setItem('cq_session', JSON.stringify(user));
  if (user.role === 'admin') {
    initAdminDashboard();
    showPage('admin');
    document.getElementById('navbar-admin').style.display = 'flex';
    document.getElementById('navbar-user').style.display = 'none';
  } else {
    initHomePage();
    showPage('home');
    document.getElementById('navbar-user').style.display = 'flex';
    document.getElementById('navbar-admin').style.display = 'none';
    document.getElementById('nav-username').textContent = user.name;
    document.getElementById('nav-avatar').textContent = user.name[0].toUpperCase();
  }
}

function handleLogout() {
  APP.currentUser = null;
  localStorage.removeItem('cq_session');
  if (APP.currentQuiz.timer) clearInterval(APP.currentQuiz.timer);
  showPage('login');
  document.getElementById('navbar-user').style.display = 'none';
  document.getElementById('navbar-admin').style.display = 'none';
}

function checkSession() {
  const session = localStorage.getItem('cq_session');
  if (session) {
    try {
      const user = JSON.parse(session);
      loginSuccess(user);
    } catch (e) { localStorage.removeItem('cq_session'); }
  }
}

function showAlert(form, msg, type) {
  const el = document.getElementById('alert-' + form);
  el.className = 'alert alert-' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearAlert() {
  document.querySelectorAll('.alert').forEach(a => a.style.display = 'none');
}

// ============ HOME PAGE ============
function initHomePage() {
  renderLeaderboard();
  document.getElementById('home-username').textContent = APP.currentUser.name.split(' ')[0];

  // Topic card clicks
  document.querySelectorAll('.topic-card').forEach(card => {
    card.onclick = () => startTopicSelection(card.dataset.topic);
  });
}

function startTopicSelection(topic) {
  const names = { react: 'React JS', python: 'Python', java: 'Java', dsa: 'DSA & Algorithms' };
  document.getElementById('modal-topic-name').textContent = names[topic];
  document.getElementById('modal-confirm').onclick = () => {
    closeModal();
    startQuiz(topic);
  };
  openModal();
}

function openModal() { document.getElementById('quiz-modal').classList.add('active'); }
function closeModal() { document.getElementById('quiz-modal').classList.remove('active'); }

function renderLeaderboard() {
  const scores = DB.getScores();
  const users = DB.getUsers();

  // Get best score per user
  const bestMap = {};
  scores.forEach(s => {
    if (!bestMap[s.userId] || s.percent > bestMap[s.userId].percent) {
      bestMap[s.userId] = s;
    }
  });

  const sorted = Object.values(bestMap).sort((a, b) => b.percent - a.percent).slice(0, 10);
  const tbody = document.getElementById('lb-body');

  if (!sorted.length) {
    tbody.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>Abhi koi score nahi hai. Pehle quiz do!</p></div>';
    return;
  }

  tbody.innerHTML = sorted.map((s, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
    const badge = i === 0 ? 'badge-gold' : i === 1 ? 'badge-silver' : i === 2 ? 'badge-bronze' : 'badge-none';
    const badgeText = i === 0 ? '🥇 Gold' : i === 1 ? '🥈 Silver' : i === 2 ? '🥉 Bronze' : 'Participant';
    return `
      <div class="lb-row">
        <span><div class="rank-badge ${rankClass}">${i + 1}</div></span>
        <span class="user-name-lb">${s.userName}</span>
        <span class="score-lb">${s.percent}%</span>
        <span class="topic-lb">${s.topicName}</span>
        <span><span class="resume-badge ${badge}">${badgeText}</span></span>
      </div>`;
  }).join('');
}

// ============ QUIZ ============
function getTopicQuestions(topic) {
  const base = QUESTIONS_DB[topic] || [];
  const custom = DB.getCustomQ().filter(q => q.topic === topic);
  const all = [...base, ...custom];
  // Shuffle and take 15 questions
  return all.sort(() => Math.random() - 0.5).slice(0, 15);
}

function startQuiz(topic) {
  const topicNames = { react: 'React JS', python: 'Python', java: 'Java', dsa: 'DSA & Algorithms' };
  const questions = getTopicQuestions(topic);

  APP.currentQuiz = {
    topic, topicName: topicNames[topic],
    questions, current: 0,
    answers: new Array(questions.length).fill(null),
    score: 0, timer: null, timeLeft: 30,
    startTime: Date.now()
  };

  renderQuiz();
  showPage('quiz');
  startTimer();
}

function renderQuiz() {
  const quiz = APP.currentQuiz;
  const q = quiz.questions[quiz.current];
  const total = quiz.questions.length;
  const idx = quiz.current;

  document.getElementById('quiz-topic-name').textContent = quiz.topicName;
  document.getElementById('quiz-progress-fill').style.width = ((idx / total) * 100) + '%';
  document.getElementById('quiz-q-num').textContent = `Q${idx + 1} / ${total}`;
  document.getElementById('quiz-q-number').textContent = `Question ${idx + 1} of ${total}`;
  document.getElementById('quiz-q-diff').textContent = q.diff;
  document.getElementById('quiz-q-diff').className = 'q-diff diff-' + q.diff;
  document.getElementById('quiz-q-text').textContent = q.q;

  const letters = ['A', 'B', 'C', 'D'];
  const optionsEl = document.getElementById('quiz-options');
  optionsEl.innerHTML = q.options.map((opt, i) => `
    <button class="option" onclick="selectAnswer(${i})" id="opt-${i}">
      <span class="option-letter">${letters[i]}</span>
      <span>${opt}</span>
    </button>
  `).join('');

  // If already answered, show selection
  if (quiz.answers[idx] !== null) {
    showAnswerFeedback(quiz.answers[idx]);
  }

  document.getElementById('btn-next').disabled = quiz.answers[idx] === null;
  document.getElementById('btn-next').textContent = idx === total - 1 ? '🏁 Finish Quiz' : 'Next →';
}

function selectAnswer(optIdx) {
  const quiz = APP.currentQuiz;
  if (quiz.answers[quiz.current] !== null) return; // Already answered

  quiz.answers[quiz.current] = optIdx;
  showAnswerFeedback(optIdx);
  document.getElementById('btn-next').disabled = false;
  clearInterval(quiz.timer);
}

function showAnswerFeedback(selected) {
  const quiz = APP.currentQuiz;
  const correct = quiz.questions[quiz.current].ans;

  document.querySelectorAll('.option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    else if (i === selected && selected !== correct) btn.classList.add('wrong');
    else if (i === selected) btn.classList.add('selected');
  });
}

function nextQuestion() {
  const quiz = APP.currentQuiz;
  clearInterval(quiz.timer);

  if (quiz.current < quiz.questions.length - 1) {
    quiz.current++;
    quiz.timeLeft = 30;
    renderQuiz();
    startTimer();
  } else {
    finishQuiz();
  }
}

function startTimer() {
  const quiz = APP.currentQuiz;
  quiz.timeLeft = 30;
  updateTimerDisplay();

  quiz.timer = setInterval(() => {
    quiz.timeLeft--;
    updateTimerDisplay();
    if (quiz.timeLeft <= 0) {
      clearInterval(quiz.timer);
      // Auto-skip if no answer
      if (quiz.answers[quiz.current] === null) {
        quiz.answers[quiz.current] = -1; // Skipped
        document.getElementById('btn-next').disabled = false;
        showAnswerFeedback(-1);
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('quiz-timer');
  el.textContent = '⏱ ' + APP.currentQuiz.timeLeft + 's';
  el.className = 'timer' + (APP.currentQuiz.timeLeft <= 10 ? ' urgent' : '');
}

function finishQuiz() {
  const quiz = APP.currentQuiz;
  clearInterval(quiz.timer);

  let correct = 0, wrong = 0, skipped = 0;
  quiz.questions.forEach((q, i) => {
    const ans = quiz.answers[i];
    if (ans === -1 || ans === null) skipped++;
    else if (ans === q.ans) correct++;
    else wrong++;
  });

  const percent = Math.round((correct / quiz.questions.length) * 100);
  const timeTaken = Math.round((Date.now() - quiz.startTime) / 1000);

  const scoreEntry = {
    id: 's' + Date.now(),
    userId: APP.currentUser.id,
    userName: APP.currentUser.name,
    topic: quiz.topic,
    topicName: quiz.topicName,
    correct, wrong, skipped,
    total: quiz.questions.length,
    percent, timeTaken,
    date: new Date().toISOString()
  };

  DB.addScore(scoreEntry);
  renderResult(scoreEntry);
  showPage('result');
  if (percent >= 70) launchConfetti();
}

function renderResult(s) {
  const deg = (s.percent / 100) * 360;
  document.getElementById('score-circle').style.setProperty('--score-deg', deg + 'deg');
  document.getElementById('score-percent').textContent = s.percent + '%';

  let grade, gradeColor, msg;
  if (s.percent >= 90) { grade = '🏆 MASTER'; gradeColor = '#f59e0b'; msg = 'Kamaal kar diya! Tum ek programming wizard ho!'; }
  else if (s.percent >= 75) { grade = '⭐ EXPERT'; gradeColor = '#00d4ff'; msg = 'Bahut badhiya! Tumhari skills kaafi strong hain!'; }
  else if (s.percent >= 60) { grade = '👍 PROFICIENT'; gradeColor = '#10b981'; msg = 'Achha performance! Thoda aur practice karo.'; }
  else if (s.percent >= 40) { grade = '📚 LEARNING'; gradeColor = '#7c3aed'; msg = 'Keep going! Consistency is key.'; }
  else { grade = '💪 BEGINNER'; gradeColor = '#ef4444'; msg = 'Mat ghabrao! Har expert pehle beginner tha.'; }

  document.getElementById('result-grade').textContent = grade;
  document.getElementById('result-grade').style.color = gradeColor;
  document.getElementById('result-msg').textContent = msg;
  document.getElementById('result-correct').textContent = s.correct;
  document.getElementById('result-wrong').textContent = s.wrong;
  document.getElementById('result-skipped').textContent = s.skipped;
  document.getElementById('result-time').textContent = s.timeTaken + 's';

  // Resume content
  const college = APP.currentUser.college || 'College Name';
  const resumeText = `• ${s.topicName} Quiz — Score: ${s.percent}% (${s.correct}/${s.total} correct)
• Grade: ${grade.replace(/[^\w\s]/gi, '').trim()} | Platform: CodeQuiz Pro
• Topics: ${s.topicName} | Date: ${new Date(s.date).toLocaleDateString('hi-IN')}
• Institution: ${college}`;
  document.getElementById('resume-text').textContent = resumeText;
}

function copyResume() {
  const text = document.getElementById('resume-text').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Resume text copy ho gaya! 📋', 'success'));
}

function goHome() {
  showPage('home');
  renderLeaderboard();
  initHomePage();
}

// ============ PROFILE ============
function showProfile() {
  const user = APP.currentUser;
  const scores = DB.getUserScores(user.id);
  const best = DB.getUserBest(user.id);
  const totalQuizzes = scores.length;

  document.getElementById('profile-avatar-letter').textContent = user.name[0].toUpperCase();
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-college').textContent = user.college || 'N/A';
  document.getElementById('profile-total-q').textContent = totalQuizzes;
  document.getElementById('profile-best').textContent = best + '%';
  document.getElementById('profile-joined').textContent = new Date(user.joined).toLocaleDateString();

  const hist = document.getElementById('profile-history');
  if (!scores.length) {
    hist.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Abhi koi quiz nahi diya. Chalo karo!</p></div>';
  } else {
    hist.innerHTML = scores.slice(0, 20).map(s => `
      <div class="history-item">
        <span style="font-size:1.4rem">${topicEmoji(s.topic)}</span>
        <div>
          <div class="history-topic">${s.topicName}</div>
          <div style="color:var(--text-secondary);font-size:0.85rem">${s.correct}/${s.total} correct</div>
        </div>
        <span class="history-score">${s.percent}%</span>
        <span class="history-date">${new Date(s.date).toLocaleDateString()}</span>
      </div>
    `).join('');
  }

  showPage('profile');
}

function topicEmoji(t) {
  return { react: '⚛️', python: '🐍', java: '☕', dsa: '🧮' }[t] || '📚';
}

// ============ ADMIN DASHBOARD ============
function initAdminDashboard() {
  document.getElementById('admin-name').textContent = APP.currentUser.name;
  document.getElementById('admin-avatar').textContent = APP.currentUser.name[0].toUpperCase();
  renderAdminDashboard();
  renderAdminUsers();
  renderAdminScores();
  renderAdminQuestions();
}

function showAdminPanel(panel) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-menu-item').forEach(i => i.classList.remove('active'));
  document.getElementById('panel-' + panel).classList.add('active');
  event.currentTarget.classList.add('active');
}

function renderAdminDashboard() {
  const users = DB.getUsers().filter(u => u.role !== 'admin');
  const scores = DB.getScores();
  const customQ = DB.getCustomQ();
  const totalQ = ALL_QUESTIONS.length + customQ.length;

  document.getElementById('stat-users').textContent = users.length;
  document.getElementById('stat-quizzes').textContent = scores.length;
  document.getElementById('stat-questions').textContent = totalQ;
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.percent, 0) / scores.length) : 0;
  document.getElementById('stat-avg').textContent = avgScore + '%';
}

function renderAdminUsers() {
  const users = DB.getUsers();
  const tbody = document.getElementById('admin-users-body');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td>${u.college || '-'}</td>
      <td>${new Date(u.joined).toLocaleDateString()}</td>
      <td>
        ${u.role !== 'admin' ? `<button class="btn-sm btn-danger" onclick="deleteUser('${u.id}')">🗑 Delete</button>` : '<span style="color:var(--accent)">Protected</span>'}
      </td>
    </tr>
  `).join('');
}

function deleteUser(id) {
  if (!confirm('Kya aap is user ko delete karna chahte hain?')) return;
  const users = DB.getUsers().filter(u => u.id !== id);
  DB.saveUsers(users);
  renderAdminUsers();
  renderAdminDashboard();
  showToast('User delete ho gaya!', 'success');
}

function renderAdminScores() {
  const scores = DB.getScores().slice(0, 50);
  const tbody = document.getElementById('admin-scores-body');
  if (!scores.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-secondary)">Koi score nahi mila</td></tr>';
    return;
  }
  tbody.innerHTML = scores.map(s => `
    <tr>
      <td>${s.userName}</td>
      <td>${s.topicName}</td>
      <td style="font-family:monospace;color:var(--accent)">${s.percent}%</td>
      <td>${s.correct}/${s.total}</td>
      <td>${s.timeTaken}s</td>
      <td>${new Date(s.date).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function renderAdminQuestions() {
  const custom = DB.getCustomQ();
  const tbody = document.getElementById('admin-q-body');
  if (!custom.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-secondary)">Koi custom question nahi. Add karo!</td></tr>';
    return;
  }
  tbody.innerHTML = custom.map((q, i) => `
    <tr>
      <td>${q.q.substring(0, 60)}...</td>
      <td>${q.topic}</td>
      <td><span class="q-diff diff-${q.diff}">${q.diff}</span></td>
      <td><button class="btn-sm btn-danger" onclick="deleteQuestion(${i})">🗑 Delete</button></td>
    </tr>
  `).join('');
}

function toggleAddQuestion() {
  const form = document.getElementById('q-form');
  form.classList.toggle('show');
}

function saveQuestion() {
  const q = document.getElementById('q-text').value.trim();
  const topic = document.getElementById('q-topic').value;
  const diff = document.getElementById('q-diff').value;
  const o1 = document.getElementById('q-opt1').value.trim();
  const o2 = document.getElementById('q-opt2').value.trim();
  const o3 = document.getElementById('q-opt3').value.trim();
  const o4 = document.getElementById('q-opt4').value.trim();
  const correct = parseInt(document.getElementById('q-correct').value);

  if (!q || !o1 || !o2 || !o3 || !o4) return showToast('Saare fields bharo!', 'error');

  const custom = DB.getCustomQ();
  custom.push({ id: 'cq' + Date.now(), q, topic, diff, options: [o1, o2, o3, o4], ans: correct });
  DB.saveCustomQ(custom);

  // Clear form
  ['q-text', 'q-opt1', 'q-opt2', 'q-opt3', 'q-opt4'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('q-form').classList.remove('show');
  renderAdminQuestions();
  renderAdminDashboard();
  showToast('Question add ho gaya! ✅', 'success');
}

function deleteQuestion(idx) {
  if (!confirm('Is question ko delete karna chahte hain?')) return;
  const custom = DB.getCustomQ();
  custom.splice(idx, 1);
  DB.saveCustomQ(custom);
  renderAdminQuestions();
  showToast('Question delete ho gaya!', 'success');
}

// ============ CONFETTI ============
function launchConfetti() {
  const colors = ['#00d4ff', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#fff'];
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';

  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      animation: confettiFall ${Math.random() * 2 + 1.5}s ease-in ${Math.random() * 2}s forwards;
    `;
    container.appendChild(el);
  }

  const style = document.createElement('style');
  style.textContent = `@keyframes confettiFall { 
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }`;
  document.head.appendChild(style);
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

// ============ PARTICLES ============
function createParticles() {
  const container = document.querySelector('.bg-animated');
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 10 + 8}s;
      animation-delay: ${Math.random() * 5}s;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: ${Math.random() > 0.5 ? '#00d4ff' : '#7c3aed'};
    `;
    container.appendChild(p);
  }
}

// ============ TOAST ============
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  createParticles();
  initAuth();
  checkSession();

  // Default to login page
  if (!APP.currentUser) {
    showPage('login');
    document.getElementById('navbar-user').style.display = 'none';
    document.getElementById('navbar-admin').style.display = 'none';
  }
});
