/* Campus Connect - shared helpers (used on every page) */

// Stops user-typed text from being treated as HTML (prevents script injection)
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

const CATEGORY_ICONS = {
  "ID Card": "🆔",
  "Calculator": "🧮",
  "Electronics": "🎧",
  "Keys": "🔑",
  "Bottle": "🧴",
  "Bags": "🎒",
  "Books": "📚",
  "Accessories": "⌚",
  "Clothing": "🧥",
  "Other": "📦"
};

function categoryIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS["Other"];
}

// Turns "2026-11-23" into "Yesterday", "3 days ago" and so on
function timeAgo(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today - d) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return days + " days ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusInfo(item) {
  if (item.status === "returned") return { label: "Returned to owner", cls: "status-returned" };
  if (item.status === "pending") return { label: "Claim pending", cls: "status-pending" };
  return { label: item.type === "lost" ? "Still missing" : "Awaiting owner", cls: "status-open" };
}

// Builds the HTML for one item card (reused on several pages)
function renderItemCard(item, index) {
  const st = statusInfo(item);
  const isLost = item.type === "lost";
  const delay = (index || 0) * 60;
  return `
    <article class="item-card" style="animation-delay:${delay}ms">
      <div class="item-top">
        <span class="badge ${isLost ? "badge-lost" : "badge-found"}">${isLost ? "Lost" : "Found"}</span>
        <span class="item-date">${escapeHTML(timeAgo(item.date))}</span>
      </div>
      <div class="item-body">
        <div class="item-icon" aria-hidden="true">${categoryIcon(item.category)}</div>
        <div>
          <h3 class="item-title">${escapeHTML(item.title)}</h3>
          <p class="item-meta">📍 ${escapeHTML(item.location)} · ${escapeHTML(item.category)}</p>
        </div>
      </div>
      <p class="item-desc">${escapeHTML(item.description)}</p>
      <div class="item-foot">
        <span class="status ${st.cls}">${st.label}</span>
        <a class="item-link" href="item.html?id=${encodeURIComponent(item.id)}">View details →</a>
      </div>
    </article>`;
}

// Mobile menu open/close
function initNav() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return;
  toggle.addEventListener("click", function () {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// Number counting animation for the stats
function countUp(el, target) {
  const duration = 900;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * progress);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Landing page: recent items + stats
function initHome() {
  const grid = document.getElementById("recentGrid");
  if (!grid) return;

  const sorted = SAMPLE_ITEMS.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });
  grid.innerHTML = sorted.slice(0, 6).map(renderItemCard).join("");

  const counts = {
    total: SAMPLE_ITEMS.length,
    lost: SAMPLE_ITEMS.filter(function (i) { return i.type === "lost"; }).length,
    found: SAMPLE_ITEMS.filter(function (i) { return i.type === "found"; }).length,
    returned: SAMPLE_ITEMS.filter(function (i) { return i.status === "returned"; }).length
  };
  document.querySelectorAll("[data-count]").forEach(function (el) {
    countUp(el, counts[el.dataset.count]);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initNav();
  initHome();
});
