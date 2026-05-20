const scoreBtn = document.getElementById('scoreBtn');
const transcriptInput = document.getElementById('transcriptInput');
const titleInput = document.getElementById('titleInput');
const resultDiv = document.getElementById('result');

// 规则分组配置
const groupConfig = {
  Opening: ["Agenda Setting", "Agenda Clarity", "Rapport Building"],
  Conducting: ["Questioning Strategy", "Responsiveness and Active Listening", "Job Relevant Probing", "Time Management", "Risk Management"],
  Closing: ["Closing Quality", "Warmth and Professional Demeanor", "Candidate Question Invitation", "Interview Closing", "Selling Roblox"]
};
// 二元评分项（1=NO，2=YES）
const binaryRules = ["Agenda Setting", "Risk Management", "Candidate Question Invitation", "Interview Closing", "Selling Roblox"];

// 本地存储历史记录
function saveScoreHistory(title, totalScore, rawData) {
  let history = JSON.parse(localStorage.getItem('interviewScoreHistory') || '[]');
  history.push({
    title: title || "Untitled Interview",
    totalScore: totalScore,
    date: new Date().toLocaleString(),
    details: rawData
  });
  localStorage.setItem('interviewScoreHistory', JSON.stringify(history));
}

// 渲染评分卡片（统一函数，打分/历史查看都用这个）
function renderScoreCards(rawData) {
  const grouped = { Opening: [], Conducting: [], Closing: [] };
  rawData.forEach(item => {
    const ruleName = item["Rule Name"];
    for (const g in groupConfig) {
      if (groupConfig[g].some(r => ruleName.includes(r))) {
        grouped[g].push(item);
        break;
      }
    }
  });

  let html = "";
  for (const groupName of ["Opening", "Conducting", "Closing"]) {
    html += `<h2 class="group-title">${groupName.toUpperCase()} THE INTERVIEW</h2><div class="card-grid">`;
    grouped[groupName].forEach(item => {
      const rule = item["Rule Name"];
      const res = item.Result;
      const reasoning = item.Reasoning || "";
      const isBinary = binaryRules.some(b => rule.includes(b));
      const displayScore = res;
      const scoreClass = isBinary ? (res === 2 ? "yes-score" : "no-score") : "num-score";

      html += `
      <div class="score-card">
        <div class="card-head">
          <h3>${rule.toUpperCase()}</h3>
          <span class="${scoreClass}">${displayScore}</span>
        </div>
        <div class="card-sub">${groupName}</div>
        <div class="card-section">
          <div class="section-label">REASONING</div>
          <div class="section-bar"></div>
          <p>${reasoning}</p>
        </div>
        <div class="card-section">
          <div class="section-label">SUGGESTION</div>
          <div class="section-bar"></div>
          <p>${res >= 2 ? "No improvement needed." : "Focus on improving consistency in this area."}</p>
        </div>
      </div>
      `;
    });
    html += `</div>`;
  }

  html += `
  <div class="bottom-action">
    <a href="upload.html" class="new-score-btn">SCORE ANOTHER INTERVIEW</a>
    <a href="history.html" class="history-btn">SCORE HISTORY</a>
  </div>
  `;
  resultDiv.innerHTML = html;
}

// 页面加载时：判断是否从历史页面跳转过来，自动展示详情
window.addEventListener('load', () => {
  if (window.location.hash === "#view-detail") {
    const idx = localStorage.getItem('viewScoreIndex');
    if (idx !== null) {
      const history = JSON.parse(localStorage.getItem('interviewScoreHistory') || '[]');
      const target = history[idx];
      titleInput.value = target.title;
      transcriptInput.value = "[Historical Record — Read Only]";
      renderScoreCards(target.details);
      localStorage.removeItem('viewScoreIndex');
    }
  }
});

// 实时统计字符数
transcriptInput.addEventListener('input', () => {
  document.querySelector('.char-count').innerText = `${transcriptInput.value.length} CHARACTERS`;
});

scoreBtn.addEventListener('click', async () => {
  const text = transcriptInput.value.trim();
  const title = titleInput.value.trim();
  if (!text) {
    resultDiv.innerHTML = "<p>Please paste your interview transcript first.</p>";
    return;
  }
  resultDiv.innerHTML = "<p>Scoring... Please wait...</p>";

  try {
    const res = await fetch('https://format-mill-protection-sent.trycloudflare.com/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
    const rawData = await res.json();

    let totalScore = 0;
    rawData.forEach(item => totalScore += item.Result);
    saveScoreHistory(title, totalScore, rawData);
    renderScoreCards(rawData);

  } catch (err) {
    resultDiv.innerHTML = "<p>Error connecting to AI backend. Please check if backend is running.</p>";
    console.error(err);
  }
});