const scoreBtn = document.getElementById('scoreBtn');
const transcriptInput = document.getElementById('transcriptInput');
const titleInput = document.getElementById('titleInput');
const typeSelect = document.getElementById('typeSelect');
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
function saveScoreHistory(title, interviewType, totalScore, rawData) {
  let history = JSON.parse(localStorage.getItem('interviewScoreHistory') || '[]');
  history.push({
    title: title || "Untitled Interview",
    interviewType: interviewType || "Not Specified",
    totalScore: totalScore,
    date: new Date().toLocaleString(),
    details: rawData
  });
  localStorage.setItem('interviewScoreHistory', JSON.stringify(history));
}
 
// 页面加载时：判断是否从历史页面跳转过来，自动展示详情
window.addEventListener('load', () => {
  if (window.location.hash === "#view-detail") {
    const idx = localStorage.getItem('viewScoreIndex');
    if (idx !== null) {
      const history = JSON.parse(localStorage.getItem('interviewScoreHistory') || '[]');
      const target = history[idx];
      // 跳转到 result.html 显示历史详情
      localStorage.setItem('currentResult', JSON.stringify(target));
      localStorage.removeItem('viewScoreIndex');
      window.location.href = 'result.html';
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
  const interviewType = typeSelect ? typeSelect.value : "";
 
  if (!text) {
    resultDiv.innerHTML = "<p>Please paste your interview transcript first.</p>";
    return;
  }
 
  scoreBtn.disabled = true;
  scoreBtn.textContent = "SCORING...";
 
  try {
    const res = await fetch('https://interviewer-scoring-ai.onrender.com/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
    const rawData = await res.json();
 
    let totalScore = 0;
    rawData.forEach(item => totalScore += item.Result);
 
    // 存历史
    saveScoreHistory(title, interviewType, totalScore, rawData);
 
    // 存当前结果，跳转到结果页
    localStorage.setItem('currentResult', JSON.stringify({
      title: title || "Untitled Interview",
      interviewType: interviewType || "Not Specified",
      totalScore: totalScore,
      date: new Date().toLocaleString(),
      details: rawData
    }));
 
    window.location.href = 'result.html';
 
  } catch (err) {
    resultDiv.innerHTML = "<p>Error connecting to AI backend. Please check if backend is running.</p>";
    console.error(err);
    scoreBtn.disabled = false;
    scoreBtn.textContent = "SCORE INTERVIEW";
  }
});
