const $ = id => document.getElementById(id);
let installPrompt = null;
let toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1800);
}
function go(page) {
  const actual = page === "drafts" ? "editor" : page === "settings" ? "create" : page;
  document.querySelectorAll(".mobile-page").forEach(x => x.classList.toggle("active", x.dataset.page === actual));
  document.querySelectorAll(".mobile-nav button").forEach(x => x.classList.toggle("active", x.dataset.go === page));
  if (page === "drafts") setTimeout(() => $("draftSearch").focus(), 50);
  if (page === "settings") toast($("mode").textContent);
  scrollTo(0, 0);
}
function snapshot() {
  const data = {};
  for (const id of ["topic","audience","tone","brief","referenceLinks","platform","title","content","visualPrompt"]) data[id] = $(id).value;
  data.page = document.querySelector(".mobile-nav button.active")?.dataset.go || "create";
  localStorage.setItem("creator-workspace", JSON.stringify(data));
}
function restore() {
  try {
    const data = JSON.parse(localStorage.getItem("creator-workspace") || "null");
    if (!data) return;
    for (const [id, value] of Object.entries(data)) if ($(id) && value != null) $(id).value = value;
    $("content").dispatchEvent(new Event("input"));
    if (matchMedia("(max-width:720px)").matches && data.page) go(data.page);
  } catch {}
}
function filterDrafts() {
  const query = $("draftSearch").value.trim().toLowerCase();
  document.querySelectorAll(".draft").forEach(card => card.hidden = query && !card.textContent.toLowerCase().includes(query));
}

document.querySelectorAll(".mobile-nav button").forEach(button => button.addEventListener("click", () => go(button.dataset.go)));
for (const id of ["topic","audience","tone","brief","referenceLinks","platform","title","content","visualPrompt"]) $(id).addEventListener("input", snapshot);
$("draftSearch").addEventListener("input", filterDrafts);
$("copyContent").addEventListener("click", async () => {
  const text = `${$("title").value}\n\n${$("content").value}`.trim();
  if (!text) return toast("没有可复制的内容");
  await navigator.clipboard.writeText(text); toast("文案已复制");
});
$("downloadImage").addEventListener("click", () => {
  const url = $("downloadImage").dataset.url; if (!url) return;
  const a = document.createElement("a"); a.href = url; a.download = `${$("title").value || "灵感工坊配图"}.webp`; a.click();
});
new MutationObserver(() => {
  const image = $("visualPreview").querySelector("img");
  if (image) { $("downloadImage").hidden = false; $("downloadImage").dataset.url = image.src; }
}).observe($("visualPreview"), { childList: true, subtree: true });
$("candidates").addEventListener("click", event => { if (event.target.dataset.pick != null && matchMedia("(max-width:720px)").matches) setTimeout(() => go("editor"), 0); });
$("generate").addEventListener("click", () => { const observer = new MutationObserver(() => { if ($("candidates").querySelector("[data-pick]") && matchMedia("(max-width:720px)").matches) { observer.disconnect(); go("candidates"); } }); observer.observe($("candidates"), { childList: true }); setTimeout(() => observer.disconnect(), 120000); });
$("save").addEventListener("click", () => setTimeout(() => { if ($("saveMessage").textContent.includes("已安全保存")) toast("草稿已保存"); }, 200));
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; $("installApp").hidden = false; });
$("installApp").addEventListener("click", async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; $("installApp").hidden = true; });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
restore();
