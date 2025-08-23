// Hondana Options & Bookmark UI logic
// Note: The API key is stored in chrome.storage.sync. Treat it as sensitive and avoid sharing synced profiles.
// Set OpenAI API Key in storage
document.getElementById("save").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  chrome.storage.sync.set({ OPENAI_API_KEY: apiKey });
});

// Get OpenAI API Key from storage and prefill the input
chrome.storage.sync.get("OPENAI_API_KEY", (data) => {
  document.getElementById("apiKey").value = data.OPENAI_API_KEY || "";
});

// Render a single bookmark tree node into a container <ul>
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

// Get bookmarks from the browser and render them
function getBookmarks() {
  const out = document.getElementById("bookmarks");
  if (!out) {
    console.warn("Bookmarks element not found");
    return;
  }
  out.innerHTML = '<div class="loading">Loading bookmarks...</div>';

  chrome.bookmarks.getTree((nodes) => {
    out.innerHTML = "";
    if (nodes && nodes.length > 0) {
      const ul = document.createElement("ul");
      nodes.forEach((node) => renderBookmarkNode(node, ul));
      out.appendChild(ul);
    } else {
      out.innerHTML =
        '<p style="text-align: center; color: #7f8c8d; padding: 20px;">No bookmarks were found.</p>';
    }
  });
}

// System prompt: role, constraints, and output format for the model
const BOOKMARKS_SYSTEM_PROMPT = `
You are a browser bookmark organization assistant.
Given the JSON from Chrome bookmarks.getTree, remove duplicates and propose a meaningful final folder structure, along with a list of applicable operations (create, move, rename, delete) to get there.

Constraints:
- Do not delete or rename top-level roots (Bookmarks Bar, Other Bookmarks, Bookmarks Menu).
- Do not invent URLs or titles that don't exist (no new URLs may be created).
- Deduplicate by URL normalization (normalize scheme, trailing slashes, presence/absence of www; ignore tracking query params like utm_* and gclid).
- Minimize the number of folders and use clear names (respect existing reasonable names).
- Limit operations to those supported by the Chrome Bookmarks API (create_folder, move, rename, delete).
- Respond with JSON only; do not include explanations. Limit to a maximum of 200 operations.

Output JSON schema:
{
  "folders": [
    { "path": "Bookmarks Bar/Development" },
    { "path": "Other Bookmarks/Learning/AI" }
  ],
  "operations": [
    { "op": "create_folder", "path": "Bookmarks Bar/Development" },
    { "op": "move", "id": "<bookmarkId>", "to": "Bookmarks Bar/Development" },
    { "op": "rename", "id": "<bookmarkOrFolderId>", "title": "<newTitle>" },
    { "op": "delete", "id": "<duplicateId>", "reason": "duplicate_of:<id_or_url>" }
  ]
}`;

function buildBookmarksUserPrompt(nodes) {
  const json = JSON.stringify(nodes, null, 2);
  return [
    "Below is the JSON returned by Chrome bookmarks.getTree.",
    "Using the constraints and schema above, return the optimal bookmark structure.",
    "Return JSON only.",
    "",
    json,
  ].join("\n");
}

async function callOpenAI(prompt) {
  const apiKey = await new Promise((resolve) => {
    chrome.storage.sync.get("OPENAI_API_KEY", (data) => {
      resolve(data.OPENAI_API_KEY || "");
    });
  });

  if (!apiKey) {
    alert("OpenAI API key is not set.");
    return;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // TODO: Consider using a newer small model (e.g., gpt-4o-mini) if available
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: BOOKMARKS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response from OpenAI";
}

function organizeBookmarks() {
  // Build a prompt from the live bookmarks tree and request an organization plan
  chrome.bookmarks.getTree(async (nodes) => {
    try {
      const prompt = buildBookmarksUserPrompt(nodes);
      const result = await callOpenAI(prompt);
      console.log(`Response from OpenAI: ${result}`);
      const organizeResult = document.getElementById("organizeResult");
      // Render as plain text to avoid HTML injection and keep JSON formatting
      organizeResult.textContent = result;
    } catch (err) {
      console.error("Failed to organize bookmarks via OpenAI:", err);
      const organizeResult = document.getElementById("organizeResult");
      if (organizeResult)
        organizeResult.textContent = "Failed to get a response from OpenAI.";
    }
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
    organizeBtn.addEventListener("click", () => organizeBookmarks());
  }

  // Auto-fetch on page load
  getBookmarks();
});
