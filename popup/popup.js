document.getElementById("save").addEventListener("click", function () {
  const apiKey = document.getElementById("apiKey").value;
  // Save the API key to storage
  chrome.storage.sync.set({ apiKey: apiKey }, function () {
    console.log("API key saved:", apiKey);
  });
});
