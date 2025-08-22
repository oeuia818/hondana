// Set OpenAI API Key in storage
document.getElementById("save").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  chrome.storage.sync.set({ OPENAI_API_KEY: apiKey });
});

// Get OpenAI API Key from storage
chrome.storage.sync.get("OPENAI_API_KEY", (data) => {
  document.getElementById("apiKey").value = data.OPENAI_API_KEY || "";
});

// Render a single bookmark node
function renderBookmarkNode(node, container) {
  const li = document.createElement("li");

  if (node.url) {
    const a = document.createElement("a");
    a.href = node.url;
    a.textContent = node.title || node.url;
    a.target = "_blank"; // Open in new tab
    li.appendChild(a);
  } else {
    li.textContent = node.title || "(Folder)";
  }

  if (node.children && node.children.length) {
    const ul = document.createElement("ul");
    node.children.forEach((child) => renderBookmarkNode(child, ul));
    li.appendChild(ul);
  }

  container.appendChild(li);
}

// Get bookmarks from the browser
function getBookmarks() {
  const out = document.getElementById("bookmarks");
  if (!out) {
    console.warn("Bookmarks element not found");
    return;
  }
  out.innerHTML = '<div class="loading">ブックマークを読み込み中...</div>';

  chrome.bookmarks.getTree((nodes) => {
    out.innerHTML = "";
    if (nodes && nodes.length > 0) {
      const ul = document.createElement("ul");
      nodes.forEach((node) => renderBookmarkNode(node, ul));
      out.appendChild(ul);
    } else {
      out.innerHTML =
        '<p style="text-align: center; color: #7f8c8d; padding: 20px;">ブックマークが見つかりませんでした。</p>';
    }
  });
}

async function callOpenAI(prompt) {
  const apiKey = await new Promise((resolve) => {
    chrome.storage.sync.get("OPENAI_API_KEY", (data) => {
      resolve(data.OPENAI_API_KEY || "");
    });
  });

  if (!apiKey) {
    alert("OpenAI APIキーが設定されていません。");
    return;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "" },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response from OpenAI";
}

function organizeBookmarks() {
  const bookmarks = chrome.bookmarks.getTree((nodes) => {
    const bookmarksJson = JSON.stringify(nodes, null, 2);
    const prompt = `${bookmarksJson}`;

    const result = callOpenAI(prompt);
    console.log(`OpenAIからの応答: ${result}`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = document.getElementById("loadBookmarks");
  const refreshBtn = document.getElementById("refreshBookmarks");
  const organizeBtn = document.getElementById("organizeBookmarks");

  if (loadBtn) {
    loadBtn.addEventListener("click", getBookmarks);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", getBookmarks);
  }

  if (organizeBtn) {
    organizeBtn.addEventListener("click", () => {
      // Organize bookmarks logic here
    });
  }

  // ページ読み込み時に自動取得
  getBookmarks();
});
