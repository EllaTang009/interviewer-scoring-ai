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
function saveScoreHistory(title, interviewType, totalScore, rawData, selectedCategories) {
  let history = JSON.parse(localStorage.getItem('interviewScoreHistory') || '[]');
  history.push({
    title: title || "Untitled Interview",
    interviewType: interviewType || "Not Specified",
    totalScore: totalScore,
    date: new Date().toLocaleString(),
    details: rawData,
    selectedCategories: selectedCategories  // ✅ 存入历史
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
 
  // ✅ 1. 读取选中的 categories，并做最少选一项的校验
  const categories = getSelectedCategories();
  if (categories.length === 0) {
    document.getElementById('cat-warning').style.display = 'block';
    return;
  }
  document.getElementById('cat-warning').style.display = 'none';
 
  scoreBtn.disabled = true;
  scoreBtn.textContent = "SCORING...";
 
  try {
    const res = await fetch('https://interviewer-scoring-ai.onrender.com/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ✅ 2. 把 categories 传给后端
      body: JSON.stringify({ text: text, categories: categories })
    });
    const rawData = await res.json();
 
    let totalScore = 0;
    rawData.forEach(item => totalScore += item.Result);
 
    // ✅ 3. 历史记录也带上 selectedCategories
    saveScoreHistory(title, interviewType, totalScore, rawData, categories);
 
    // ✅ 4. 当前结果带上 selectedCategories，result.html 读取后只渲染对应分组
    localStorage.setItem('currentResult', JSON.stringify({
      title: title || "Untitled Interview",
      interviewType: interviewType || "Not Specified",
      totalScore: totalScore,
      date: new Date().toLocaleString(),
      details: rawData,
      selectedCategories: categories   // ✅ 加这行
    }));
 
    window.location.href = 'result.html';
 
  } catch (err) {
    resultDiv.innerHTML = "<p>Error connecting to AI backend. Please check if backend is running.</p>";
    console.error(err);
    scoreBtn.disabled = false;
    scoreBtn.textContent = "SCORE INTERVIEW";
  }
});
