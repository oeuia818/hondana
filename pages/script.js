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
    a.hred = node.url;
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
  out.innerHTML = "Loading bookmarks...";

  chrome.bookmarks.getTree((nodes) => {
    out.innerHTML = "";
    const ul = document.createElement("ul");
    nodes.forEach((node) => renderBookmarkNode(node, ul));
    out.appendChild(ul);
  });
}

document.addEventListener("DOMContentLoaded", getBookmarks);
