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
 
// 满分配置：binary 满分 2，scaled 满分 3
function getMaxScore(ruleName) {
  return binaryRules.some(b => ruleName.includes(b)) ? 2 : 3;
}
 
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
 
// ─────────────────────────────────────────────
// 新增：生成可视化 HTML（总分概览 + 条形图）
// ─────────────────────────────────────────────
function renderVisualization(rawData) {
  // 1. 计算分组得分
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
 
  const groupStats = {};
  let totalScore = 0;
  let totalMax = 0;
  for (const g of ["Opening", "Conducting", "Closing"]) {
    let score = 0, max = 0;
    grouped[g].forEach(item => {
      score += item.Result;
      max += getMaxScore(item["Rule Name"]);
    });
    groupStats[g] = { score, max };
    totalScore += score;
    totalMax += max;
  }
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const dimensionCount = rawData.length;
 
  // 2. 总分颜色
  const scoreColor = pct >= 80 ? "#1D9E75" : pct >= 60 ? "#BA7517" : "#E24B4A";
 
  // 3. 雷达图三角坐标（等边三角形，顶点=Opening，右下=Closing，左下=Conducting）
  // 中心 (120, 110)，外接圆半径 90
  const cx = 120, cy = 105, R = 85;
  const angles = [-90, 30, 150]; // 顶 右下 左下（度）
  function pt(r, deg) {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  const outerPts = angles.map(a => pt(R, a));
  const groups = ["Opening", "Closing", "Conducting"];
  const dataPts = groups.map((g, i) => {
    const ratio = groupStats[g].max > 0 ? groupStats[g].score / groupStats[g].max : 0;
    return pt(R * ratio, angles[i]);
  });
 
  function ptsToStr(pts) {
    return pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  }
 
  // 内层参考网格（50% 和 75%）
  const grid50 = angles.map(a => pt(R * 0.5, a));
  const grid75 = angles.map(a => pt(R * 0.75, a));
 
  // 标签位置（略超出外圆）
  const labelOffset = R + 18;
  const labelPts = [
    pt(labelOffset, -90),  // Opening 顶部
    pt(labelOffset, 30),   // Closing 右下
    pt(labelOffset, 150),  // Conducting 左下
  ];
 
  // 4. 条形图
  const barItems = rawData.map(item => {
    const isBinary = binaryRules.some(b => item["Rule Name"].includes(b));
    const max = isBinary ? 2 : 3;
    const ratio = item.Result / max;
    let color, label;
    if (isBinary) {
      color = item.Result === 2 ? "#1D9E75" : "#E24B4A";
      label = item.Result === 2 ? "✓" : "✗";
    } else {
      color = item.Result === 3 ? "#1D9E75" : item.Result === 2 ? "#378ADD" : "#E24B4A";
      label = item.Result;
    }
    // 缩短名称以适应空间
    const shortName = item["Rule Name"].length > 26 ? item["Rule Name"].slice(0, 24) + "…" : item["Rule Name"];
    return { shortName, ratio, color, label };
  });
 
  const barsHtml = barItems.map(b => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;">
      <div style="width:175px;flex-shrink:0;font-size:12px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.shortName}</div>
      <div style="flex:1;height:8px;background:var(--color-background-secondary);border-radius:4px;overflow:hidden;">
        <div style="width:${Math.round(b.ratio * 100)}%;height:100%;background:${b.color};border-radius:4px;transition:width 0.6s ease;"></div>
      </div>
      <div style="width:20px;text-align:right;font-size:12px;color:var(--color-text-secondary);">${b.label}</div>
    </div>
  `).join("");
 
  return `
  <div style="margin-bottom:2rem;">
 
    <!-- 总分概览 -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1.5rem;">
      <div style="background:var(--color-background-secondary);border-radius:8px;padding:1rem;text-align:center;">
        <div style="font-size:28px;font-weight:500;color:${scoreColor};">${totalScore}<span style="font-size:14px;color:var(--color-text-secondary);font-weight:400;"> / ${totalMax}</span></div>
        <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">总分</div>
      </div>
      <div style="background:var(--color-background-secondary);border-radius:8px;padding:1rem;text-align:center;">
        <div style="font-size:28px;font-weight:500;color:${scoreColor};">${pct}%</div>
        <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">得分率</div>
      </div>
      <div style="background:var(--color-background-secondary);border-radius:8px;padding:1rem;text-align:center;">
        <div style="font-size:28px;font-weight:500;color:var(--color-text-primary);">${dimensionCount}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">评分维度</div>
      </div>
    </div>
 
    <!-- 雷达图 + 条形图 并排 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
 
      <!-- 雷达图 -->
      <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:12px;padding:1rem;">
        <div style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin-bottom:10px;">板块对比</div>
        <svg width="100%" viewBox="0 0 240 210" role="img" aria-label="三大板块雷达图">
          <title>板块得分雷达图</title>
          <!-- 网格 -->
          <polygon points="${ptsToStr(grid50)}" fill="none" stroke="var(--color-border-tertiary)" stroke-width="0.5"/>
          <polygon points="${ptsToStr(grid75)}" fill="none" stroke="var(--color-border-tertiary)" stroke-width="0.5"/>
          <polygon points="${ptsToStr(outerPts)}" fill="none" stroke="var(--color-border-tertiary)" stroke-width="0.5"/>
          <!-- 轴线 -->
          ${outerPts.map(p => `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="var(--color-border-tertiary)" stroke-width="0.5"/>`).join("")}
          <!-- 数据区 -->
          <polygon points="${ptsToStr(dataPts)}" fill="#378ADD" fill-opacity="0.2" stroke="#378ADD" stroke-width="1.5"/>
          ${dataPts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#378ADD"/>`).join("")}
          <!-- 标签 -->
          <text x="${labelPts[0][0].toFixed(1)}" y="${(labelPts[0][1] - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--color-text-secondary)">Opening</text>
          <text x="${labelPts[0][0].toFixed(1)}" y="${(labelPts[0][1] + 8).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="500" fill="var(--color-text-primary)">${groupStats["Opening"].score}/${groupStats["Opening"].max}</text>
          <text x="${labelPts[1][0].toFixed(1)}" y="${(labelPts[1][1] - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--color-text-secondary)">Closing</text>
          <text x="${labelPts[1][0].toFixed(1)}" y="${(labelPts[1][1] + 8).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="500" fill="var(--color-text-primary)">${groupStats["Closing"].score}/${groupStats["Closing"].max}</text>
          <text x="${labelPts[2][0].toFixed(1)}" y="${(labelPts[2][1] - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--color-text-secondary)">Conducting</text>
          <text x="${labelPts[2][0].toFixed(1)}" y="${(labelPts[2][1] + 8).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="500" fill="var(--color-text-primary)">${groupStats["Conducting"].score}/${groupStats["Conducting"].max}</text>
        </svg>
      </div>
 
      <!-- 条形图 -->
      <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:12px;padding:1rem;">
        <div style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin-bottom:4px;">各维度得分</div>
        <div style="display:flex;gap:10px;margin-bottom:10px;font-size:11px;color:var(--color-text-secondary);">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#1D9E75;margin-right:3px;vertical-align:middle;"></span>优秀</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#378ADD;margin-right:3px;vertical-align:middle;"></span>良好</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#E24B4A;margin-right:3px;vertical-align:middle;"></span>待提升</span>
        </div>
        ${barsHtml}
      </div>
 
    </div>
  </div>
  `;
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
 
  // ── 新增：顶部可视化 ──
  let html = renderVisualization(rawData);
 
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
    const res = await fetch('https://interviewer-scoring-ai.onrender.com/score', {
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
