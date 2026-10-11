// detailedReport.js
// Logic for DetailedReport.html
// Renders similarity highlights, common phrases, and spelling mistakes

import {
  detectSpellingMistakes,
  extractCommonPhrases,
  highlightTextWithMatchesAndTypos
} from "../../Backend/SpellChecker.js";

// =========================================
// GLOBAL STATE
// =========================================
let currentReport = null;
let currentPhrases = [];
let currentTyposA = [];
let currentTyposB = [];
let allTypos = [];

// =========================================
// INITIALIZE REPORT ON DOM LOAD
// =========================================
document.addEventListener("DOMContentLoaded", async function () {
  setupTabs();
  setupToggles();
  setupSearch();
  setupDownloadClean();

  await loadAndRenderReport();
});

// =========================================
// TAB SWITCHING LOGIC
// =========================================
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  for (let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].addEventListener("click", function () {
      const targetId = this.getAttribute("data-tab");

      // Deactivate all
      for (let j = 0; j < tabButtons.length; j++) {
        tabButtons[j].classList.remove("active");
      }
      for (let j = 0; j < tabPanes.length; j++) {
        tabPanes[j].classList.remove("active");
      }

      // Activate clicked
      this.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane !== null) {
        targetPane.classList.add("active");
      }
    });
  }
}

// =========================================
// TOGGLE HIGHLIGHTS LOGIC
// =========================================
function setupToggles() {
  const toggleMatches = document.getElementById("toggleMatches");
  const toggleTypos = document.getElementById("toggleTypos");

  function onToggleChange() {
    if (!currentReport) return;

    const showMatches = toggleMatches ? toggleMatches.checked : true;
    const showTypos = toggleTypos ? toggleTypos.checked : true;

    renderDocumentTexts(showMatches, showTypos);
  }

  if (toggleMatches !== null) {
    toggleMatches.addEventListener("change", onToggleChange);
  }

  if (toggleTypos !== null) {
    toggleTypos.addEventListener("change", onToggleChange);
  }
}

// =========================================
// SEARCH COMMON PHRASES
// =========================================
function setupSearch() {
  const searchInput = document.getElementById("phrasesSearch");

  if (searchInput !== null) {
    searchInput.addEventListener("input", function () {
      const query = this.value.trim().toLowerCase();
      filterPhrases(query);
    });
  }
}

function filterPhrases(query) {
  const phrasesGrid = document.getElementById("phrasesGrid");
  if (!phrasesGrid) return;

  if (!query) {
    renderPhrasesList(currentPhrases);
    return;
  }

  const filtered = [];
  for (let i = 0; i < currentPhrases.length; i++) {
    if (currentPhrases[i].phrase.toLowerCase().includes(query)) {
      filtered.push(currentPhrases[i]);
    }
  }

  renderPhrasesList(filtered);
}

// =========================================
// LOAD REPORT DATA (FROM URL, SESSION, OR DB)
// =========================================
async function loadAndRenderReport() {
  let report = null;

  // 1. Try URL query param ?id=...
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");

  if (reportId) {
    try {
      const response = await fetch("http://localhost:3000/reports/" + encodeURIComponent(reportId));
      if (response.ok) {
        report = await response.json();
      }
    } catch (e) {
      console.warn("Could not fetch report by ID:", e);
    }
  }

  // 2. Try sessionStorage "reportData"
  if (!report) {
    try {
      const stored = sessionStorage.getItem("reportData");
      if (stored) {
        report = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Session reportData error:", e);
    }
  }

  // 3. Try sessionStorage "lastAnalysisResult"
  if (!report) {
    try {
      const lastRes = sessionStorage.getItem("lastAnalysisResult");
      if (lastRes) {
        report = JSON.parse(lastRes);
      }
    } catch (e) {
      console.warn("Session lastAnalysisResult error:", e);
    }
  }

  // 4. Try loading from database fileresult fallback
  if (!report) {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      try {
        const response = await fetch("http://localhost:3000/fileresult?email=" + encodeURIComponent(userEmail));
        if (response.ok) {
          const list = await response.json();
          if (list && list.length > 0 && Array.isArray(list[0].filesprocesed) && list[0].filesprocesed.length > 0) {
            const arr = list[0].filesprocesed;
            report = arr[arr.length - 1];
          }
        }
      } catch (e) {
        console.warn("Database fallback error:", e);
      }
    }
  }

  // If still no report, generate demo sample report for preview
  if (!report) {
    report = getDemoReport();
  }

  currentReport = report;
  renderReportDetails(report);
}

// =========================================
// MAIN RENDER FUNCTION
// =========================================
function renderReportDetails(report) {
  // Extract filenames
  let fileAName = "Document 1.txt";
  let fileBName = "Document 2.txt";

  if (Array.isArray(report.filenames) && report.filenames.length >= 2) {
    fileAName = report.filenames[0];
    fileBName = report.filenames[1];
  } else if (Array.isArray(report.files) && report.files.length >= 2) {
    fileAName = report.files[0];
    fileBName = report.files[1];
  }

  const textA = report.textA || "";
  const textB = report.textB || "";

  // Similarity score
  let similarity = 0;
  if (report.roundedscore !== undefined) {
    similarity = parseFloat(report.roundedscore);
  } else if (report.similarity !== undefined) {
    similarity = parseFloat(report.similarity);
  }
  similarity = Math.round(similarity * 10) / 10;

  // Extract matches
  const matchesA = Array.isArray(report.filefirstmatches)
    ? report.filefirstmatches
    : Array.isArray(report.matchesA)
      ? report.matchesA
      : [];

  // Detect spelling mistakes
  currentTyposA = detectSpellingMistakes(textA, fileAName);
  currentTyposB = detectSpellingMistakes(textB, fileBName);
  allTypos = currentTyposA.concat(currentTyposB);

  // Extract common phrases
  currentPhrases = extractCommonPhrases(matchesA, textA, textB);

  // Total words
  const wordsA = textA ? textA.trim().split(/\s+/).length : 0;
  const wordsB = textB ? textB.trim().split(/\s+/).length : 0;
  const totalWords = wordsA + wordsB;

  // 1. Update Header Information
  const subDocA = document.getElementById("subDocA");
  const subDocB = document.getElementById("subDocB");
  if (subDocA) subDocA.textContent = fileAName;
  if (subDocB) subDocB.textContent = fileBName;

  const docAName = document.getElementById("docAName");
  const docBName = document.getElementById("docBName");
  if (docAName) docAName.textContent = fileAName;
  if (docBName) docBName.textContent = fileBName;

  const docAMeta = document.getElementById("docAMeta");
  const docBMeta = document.getElementById("docBMeta");
  if (docAMeta) docAMeta.textContent = wordsA.toLocaleString() + " words";
  if (docBMeta) docBMeta.textContent = wordsB.toLocaleString() + " words";

  const reportDate = document.getElementById("reportDate");
  if (reportDate) {
    const d = report.date ? new Date(report.date) : new Date();
    reportDate.textContent = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  const reportIdSpan = document.getElementById("reportIdSpan");
  if (reportIdSpan) {
    reportIdSpan.textContent = "ID: #" + (report.id || "REP-" + Math.floor(1000 + Math.random() * 9000));
  }

  // 2. Update Score Circle & Risk Badge
  const overallSimilarity = document.getElementById("overallSimilarity");
  if (overallSimilarity) {
    overallSimilarity.textContent = similarity + "%";
  }

  const scoreCircle = document.getElementById("scoreCircle");
  if (scoreCircle) {
    let color = "#10b981"; // good
    if (similarity >= 50) {
      color = "#ef4444"; // danger
    } else if (similarity >= 20) {
      color = "#f59e0b"; // warn
    }
    scoreCircle.style.background = `conic-gradient(${color} ${similarity}%, #e2e8f0 ${similarity}%)`;
  }

  const scoreRiskBadge = document.getElementById("scoreRiskBadge");
  if (scoreRiskBadge) {
    if (similarity >= 50) {
      scoreRiskBadge.className = "score-badge high";
      scoreRiskBadge.textContent = "High Similarity";
    } else if (similarity >= 20) {
      scoreRiskBadge.className = "score-badge medium";
      scoreRiskBadge.textContent = "Medium Similarity";
    } else {
      scoreRiskBadge.className = "score-badge low";
      scoreRiskBadge.textContent = "Low Similarity";
    }
  }

  // 3. Update Stat Cards
  const cardSimVal = document.getElementById("cardSimVal");
  if (cardSimVal) cardSimVal.textContent = similarity + "%";

  const cardPhrasesVal = document.getElementById("cardPhrasesVal");
  if (cardPhrasesVal) cardPhrasesVal.textContent = currentPhrases.length;

  const cardTyposVal = document.getElementById("cardTyposVal");
  if (cardTyposVal) cardTyposVal.textContent = allTypos.length;

  const cardWordsVal = document.getElementById("cardWordsVal");
  if (cardWordsVal) cardWordsVal.textContent = totalWords.toLocaleString();

  // 4. Update Tab Badges
  const tabPhrasesCount = document.getElementById("tabPhrasesCount");
  if (tabPhrasesCount) tabPhrasesCount.textContent = currentPhrases.length;

  const tabTyposCount = document.getElementById("tabTyposCount");
  if (tabTyposCount) tabTyposCount.textContent = allTypos.length;

  // 5. Render Documents with Highlights
  renderDocumentTexts(true, true);

  // 6. Render Common Phrases List
  renderPhrasesList(currentPhrases);

  // 7. Render Spelling Mistakes
  renderTyposList(allTypos);

  // 8. Render Summary Details
  renderSummaryDetails(similarity, currentPhrases.length, allTypos.length);
}

// =========================================
// RENDER DOCUMENT TEXT WITH HIGHLIGHTS
// =========================================
function renderDocumentTexts(showMatches, showTypos) {
  if (!currentReport) return;

  const textA = currentReport.textA || "";
  const textB = currentReport.textB || "";

  const matchesA = Array.isArray(currentReport.filefirstmatches)
    ? currentReport.filefirstmatches
    : Array.isArray(currentReport.matchesA)
      ? currentReport.matchesA
      : [];

  const matchesB = Array.isArray(currentReport.filesecondmatches)
    ? currentReport.filesecondmatches
    : Array.isArray(currentReport.matchesB)
      ? currentReport.matchesB
      : [];

  const docABody = document.getElementById("docABody");
  const docBBody = document.getElementById("docBBody");

  if (docABody) {
    docABody.innerHTML = highlightTextWithMatchesAndTypos(textA, matchesA, currentTyposA, {
      showMatches: showMatches,
      showTypos: showTypos
    });
  }

  if (docBBody) {
    docBBody.innerHTML = highlightTextWithMatchesAndTypos(textB, matchesB, currentTyposB, {
      showMatches: showMatches,
      showTypos: showTypos
    });
  }
}

// =========================================
// RENDER COMMON PHRASES LIST
// =========================================
function renderPhrasesList(phrases) {
  const phrasesGrid = document.getElementById("phrasesGrid");
  if (!phrasesGrid) return;

  if (!phrases || phrases.length === 0) {
    phrasesGrid.innerHTML = `
      <div class="empty-state">
        <h3>No common phrases detected</h3>
        <p>No multi-word duplicate phrases found between these documents.</p>
      </div>
    `;
    return;
  }

  let html = "";
  for (let i = 0; i < phrases.length; i++) {
    const item = phrases[i];
    html += `
      <div class="phrase-item">
        <div class="phrase-content">
          <div class="phrase-text">"${escapeHtml(item.phrase)}"</div>
          <div class="phrase-meta">
            <span>📏 ${item.wordCount} words</span>
            <span>•</span>
            <span>🔁 Found ${item.count} time${item.count > 1 ? "s" : ""}</span>
          </div>
        </div>
        <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" onclick="locatePhrase('${escapeHtml(item.phrase)}')">
          Find in Text →
        </button>
      </div>
    `;
  }

  phrasesGrid.innerHTML = html;
}

// Make locatePhrase globally available
window.locatePhrase = function (phraseText) {
  // Switch to Highlight tab
  const tabBtn = document.querySelector(".tab-btn[data-tab='tab-highlight']");
  if (tabBtn) tabBtn.click();

  // Scroll to first mark or occurrence
  setTimeout(function () {
    const marks = document.querySelectorAll("mark.highlight-match");
    for (let i = 0; i < marks.length; i++) {
      if (marks[i].textContent.toLowerCase().includes(phraseText.toLowerCase())) {
        marks[i].scrollIntoView({ behavior: "smooth", block: "center" });
        marks[i].style.outline = "3px solid #f59e0b";
        setTimeout(() => { marks[i].style.outline = ""; }, 2000);
        break;
      }
    }
  }, 100);
};

// =========================================
// RENDER SPELLING MISTAKES LIST
// =========================================
function renderTyposList(typos) {
  const tbody = document.getElementById("typosTableBody");
  const bannerDesc = document.getElementById("typosBannerDesc");

  if (bannerDesc) {
    bannerDesc.textContent = typos.length === 0
      ? "Great news! No common academic or English spelling mistakes detected."
      : `Found ${typos.length} common spelling mistake${typos.length > 1 ? "s" : ""} across the analyzed documents.`;
  }

  if (!tbody) return;

  if (!typos || typos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;padding:40px;color:#10b981;font-weight:700;">
          ✓ No spelling mistakes or common typos found in either document!
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (let i = 0; i < typos.length; i++) {
    const t = typos[i];
    html += `
      <tr>
        <td>
          <span class="typo-tag-wrong">${escapeHtml(t.word)}</span>
        </td>
        <td>
          <span class="typo-tag-right">✓ ${escapeHtml(t.suggestion)}</span>
        </td>
        <td>
          <span class="typo-doc-badge">${escapeHtml(t.docLabel || "Document")}</span>
        </td>
        <td>
          <div class="typo-context">${escapeHtml(t.context || "—")}</div>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

// =========================================
// RENDER SUMMARY DETAILS
// =========================================
function renderSummaryDetails(similarity, phraseCount, typoCount) {
  const summaryRiskDetail = document.getElementById("summaryRiskDetail");
  if (summaryRiskDetail) {
    if (similarity >= 50) {
      summaryRiskDetail.textContent = `High similarity score (${similarity}%). Substantial duplicate content detected across sections.`;
    } else if (similarity >= 20) {
      summaryRiskDetail.textContent = `Moderate similarity score (${similarity}%). Noticeable shared terminology and phrasing present.`;
    } else {
      summaryRiskDetail.textContent = `Low similarity score (${similarity}%). Content appears largely original with typical reference matches.`;
    }
  }

  const summaryTypoDetail = document.getElementById("summaryTypoDetail");
  if (summaryTypoDetail) {
    summaryTypoDetail.textContent = typoCount === 0
      ? "Writing mechanics are clean with 0 identified spelling errors."
      : `${typoCount} spelling mistakes detected. We recommend correcting these typos before final submission.`;
  }
}

// =========================================
// DOWNLOAD CORRECTED DOCUMENT
// =========================================
function setupDownloadClean() {
  const btnA = document.getElementById("downloadCleanBtnA");
  const btnB = document.getElementById("downloadCleanBtnB");

  if (btnA) {
    btnA.addEventListener("click", function () {
      if (!currentReport) return;
      const textA = currentReport.textA || "";
      const filenames = currentReport.filenames || currentReport.files || ["Document_A.txt"];
      downloadCorrectedDocument(textA, currentTyposA, filenames[0]);
    });
  }

  if (btnB) {
    btnB.addEventListener("click", function () {
      if (!currentReport) return;
      const textB = currentReport.textB || "";
      const filenames = currentReport.filenames || currentReport.files || ["", "Document_B.txt"];
      downloadCorrectedDocument(textB, currentTyposB, filenames[1] || "Document_B.txt");
    });
  }
}

function downloadCorrectedDocument(text, typos, filename) {
  if (!text) {
    alert("No document text to export.");
    return;
  }

  let cleanText = text;
  // Sort typos descending by index to avoid index shifting
  const sorted = [...(typos || [])].sort(function (a, b) {
    return b.startIndex - a.startIndex;
  });

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    cleanText = cleanText.substring(0, t.startIndex) + t.suggestion + cleanText.substring(t.endIndex);
  }

  const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.download = "Corrected_" + (filename || "assignment.txt");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}

// =========================================
// HTML ESCAPE
// =========================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =========================================
// SAMPLE DEMO DATA (IF NO SESSION SAVED)
// =========================================
function getDemoReport() {
  return {
    id: "REP-DEMO",
    date: new Date().toISOString(),
    filenames: ["CS-309_Unit_Test.txt", "CS-301_Mid_Semester.txt"],
    similarity: 18.5,
    roundedscore: 18.5,
    textA: `CS-309 — AI & Neural Networks Unit Test
Department of Computer Science

Instructions:
- Write your answers clearly and avoid plagarism in any assigment.
- An enviroment with proper testing was created.
- The algorithm has the best average-case time complexity.
- What is the worst-case time complexity of Merge Sort?
- Which sorting algorithm is stable?
- The space complexity of Heap Sort is O(1).
- An unexpected error occured during algorithm execution.
- Be careful not to recieve unverified code from unapproved sources.`,
    textB: `CS-301 — Algorithms & Complexity Mid Semester
Department of Computer Science

Instructions:
- Write your answers clearly and avoid plagarism in any assigment.
- Ensure the proper development enviroment is set up.
- The algorithm has the best average-case time complexity.
- What is the worst-case time complexity of Merge Sort?
- Which sorting algorithm is stable?
- The space complexity of Heap Sort is O(1).
- Verify all algorithms before final submission.`,
    filefirstmatches: [
      { phrase: "Department of Computer Science", startIndex: 6, endIndex: 10, length: 4 },
      { phrase: "Write your answers clearly and avoid", startIndex: 12, endIndex: 18, length: 6 },
      { phrase: "The algorithm has the best average-case time complexity.", startIndex: 28, endIndex: 36, length: 8 },
      { phrase: "What is the worst-case time complexity of Merge Sort?", startIndex: 37, endIndex: 47, length: 9 },
      { phrase: "Which sorting algorithm is stable?", startIndex: 48, endIndex: 53, length: 5 },
      { phrase: "The space complexity of Heap Sort is O(1).", startIndex: 54, endIndex: 63, length: 9 }
    ],
    filesecondmatches: [
      { phrase: "Department of Computer Science", startIndex: 6, endIndex: 10, length: 4 },
      { phrase: "Write your answers clearly and avoid", startIndex: 12, endIndex: 18, length: 6 },
      { phrase: "The algorithm has the best average-case time complexity.", startIndex: 24, endIndex: 32, length: 8 },
      { phrase: "What is the worst-case time complexity of Merge Sort?", startIndex: 33, endIndex: 43, length: 9 },
      { phrase: "Which sorting algorithm is stable?", startIndex: 44, endIndex: 49, length: 5 },
      { phrase: "The space complexity of Heap Sort is O(1).", startIndex: 50, endIndex: 59, length: 9 }
    ]
  };
}