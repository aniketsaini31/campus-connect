/* Campus Connect - Dashboard (Firebase version) */
(function () {
  "use strict";

  var STATUS_TEXT = {
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    returned: "Returned"
  };

  var TABS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "returned", label: "Returned" },
    { key: "rejected", label: "Rejected" }
  ];

  var activeTab = "all";
  var errors = {};
  var busy = false;

  function el(id) { return document.getElementById(id); }

  function formatDateTime(iso) {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function newestFirst(a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }

  function findClaim(id) {
    var all = CCStore.getAllClaims();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  // Claims on items I found (the admin sees every claim)
  function managedClaims() {
    var user = CCStore.getUser();
    if (!user) return [];
    return CCStore.getAllClaims().filter(function (c) {
      return CCStore.isAdmin() || c.finderUid === user.uid;
    });
  }

  // Claims I made on other people's items
  function myClaimList() {
    var user = CCStore.getUser();
    if (!user) return [];
    return CCStore.getAllClaims().filter(function (c) { return c.claimantUid === user.uid; });
  }

  function signInBox(text) {
    return '<div class="empty"><div class="empty-icon" aria-hidden="true">🔐</div><h3>Sign in required</h3><p>' +
      text + '</p><button type="button" class="btn btn-primary" data-signin="1">Sign in with Google</button></div>';
  }

  /* ---------- Statistics (public data) ---------- */
  function renderStats() {
    var total = SAMPLE_ITEMS.length;
    var lost = SAMPLE_ITEMS.filter(function (i) { return i.type === "lost"; }).length;
    var found = SAMPLE_ITEMS.filter(function (i) { return i.type === "found"; }).length;
    var returned = SAMPLE_ITEMS.filter(function (i) { return i.status === "returned"; }).length;
    var pending = managedClaims().filter(function (c) { return c.status === "pending"; }).length;
    var rate = total ? Math.round((returned / total) * 100) : 0;

    var cards = [
      { num: total, lbl: "Total reports" },
      { num: lost, lbl: "Items lost" },
      { num: found, lbl: "Items found" },
      { num: returned, lbl: "Returned to owners" },
      { num: pending, lbl: "Claims awaiting your review" },
      { num: rate + "%", lbl: "Return rate" }
    ];
    el("statGrid").innerHTML = cards.map(function (c) {
      return '<div class="dash-stat"><div class="num">' + c.num + '</div><div class="lbl">' + c.lbl + "</div></div>";
    }).join("");
  }

  function renderCategories() {
    var counts = {};
    SAMPLE_ITEMS.forEach(function (i) { counts[i.category] = (counts[i.category] || 0) + 1; });
    var rows = Object.keys(counts).map(function (k) { return { name: k, n: counts[k] }; });
    rows.sort(function (a, b) { return b.n - a.n; });
    var max = rows.length ? rows[0].n : 1;

    el("catBars").innerHTML = rows.map(function (r) {
      var width = Math.round((r.n / max) * 100);
      return '<div class="bar-row"><span>' + categoryIcon(r.name) + " " + escapeHTML(r.name) + "</span>" +
        '<div class="bar-track"><div class="bar-fill" style="width:' + width + '%"></div></div><b>' + r.n + "</b></div>";
    }).join("");
  }

  /* ---------- My reports ---------- */
  function renderMyReports() {
    var box = el("myReports");
    if (!CCStore.isSignedIn()) {
      box.innerHTML = signInBox("Sign in to see your reports and the claims on them.");
      return;
    }
    var mine = SAMPLE_ITEMS.filter(function (i) { return CCStore.isMine(i); });
    if (!mine.length) {
      box.innerHTML = '<p class="muted-text">Reports you submit will appear here, with their claim status.</p>' +
        '<p style="margin-top:12px"><a href="report.html" class="btn btn-outline">Report an item</a></p>';
      return;
    }
    mine.sort(function (a, b) { return b.date.localeCompare(a.date); });
    var shown = mine.slice(0, 8);
    var html = shown.map(function (i) {
      var st = statusInfo(i);
      var n = CCStore.getClaimsForItem(i.id).length;
      return '<div class="mini-item"><div><a href="item.html?id=' + encodeURIComponent(i.id) + '">' + escapeHTML(i.title) + "</a>" +
        "<small>" + (i.type === "lost" ? "Lost" : "Found") + " · " + n + " claim" + (n === 1 ? "" : "s") + "</small></div>" +
        '<span class="status ' + st.cls + '">' + st.label + "</span></div>";
    }).join("");
    if (mine.length > shown.length) {
      html += '<p class="muted-text" style="margin-top:10px">+ ' + (mine.length - shown.length) + " more reports.</p>";
    }
    box.innerHTML = html;
  }

  /* ---------- Claims I made ---------- */
  function ensureMyClaimsPanel() {
    if (el("myClaimsPanel")) return;
    var panel = document.createElement("div");
    panel.className = "panel";
    panel.id = "myClaimsPanel";
    panel.style.marginTop = "20px";
    panel.innerHTML = '<h3>Claims I made</h3><div id="myClaimList"></div>';
    var claimsPanel = document.querySelector(".claims-panel");
    claimsPanel.parentNode.insertBefore(panel, claimsPanel);
  }

  function renderMyClaims() {
    ensureMyClaimsPanel();
    var box = el("myClaimList");
    if (!CCStore.isSignedIn()) {
      box.innerHTML = '<p class="muted-text">Sign in to track claims you have made.</p>';
      return;
    }
    var list = myClaimList().sort(newestFirst);
    if (!list.length) {
      box.innerHTML = '<p class="muted-text">You have not claimed anything yet. If a found item is yours, open it from Browse and submit a claim.</p>';
      return;
    }
    box.innerHTML = list.map(function (c) {
      var extra = "";
      if (c.status === "approved") extra = " · Approved, the finder will contact you";
      if (c.status === "rejected") extra = " · The finder could not verify this claim";
      if (c.status === "returned") extra = " · Received by " + escapeHTML(c.receivedBy || "you");
      return '<div class="mini-item"><div><a href="item.html?id=' + encodeURIComponent(c.itemId) + '">' + escapeHTML(c.itemTitle) + "</a>" +
        "<small>" + escapeHTML(c.id) + " · " + escapeHTML(formatDateTime(c.createdAt)) + extra + "</small></div>" +
        '<span class="pill-status pill-' + c.status + '">' + STATUS_TEXT[c.status] + "</span></div>";
    }).join("");
  }

  /* ---------- Claim management (finder / admin) ---------- */
  function ensureGate() {
    var gate = el("claimGate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "claimGate";
      document.querySelector(".claims-panel").appendChild(gate);
    }
    return gate;
  }

  function renderTabs(all) {
    el("claimTabs").innerHTML = TABS.map(function (t) {
      var n = t.key === "all" ? all.length : all.filter(function (c) { return c.status === t.key; }).length;
      var active = t.key === activeTab;
      return '<button type="button" class="seg' + (active ? " active" : "") + '" data-tab="' + t.key +
        '" aria-pressed="' + active + '">' + t.label + " (" + n + ")</button>";
    }).join("");
  }

  function actionsFor(c) {
    var err = errors[c.id] ? '<p class="action-error">' + escapeHTML(errors[c.id]) + "</p>" : "";
    if (c.status === "pending") {
      return '<div class="claim-actions">' +
        '<button type="button" class="btn btn-primary" data-action="approve" data-id="' + c.id + '">Approve claim</button>' +
        '<button type="button" class="btn btn-danger" data-action="reject" data-id="' + c.id + '">Reject</button>' + err + "</div>";
    }
    if (c.status === "approved") {
      return '<div class="claim-actions">' +
        '<input type="text" id="recv-' + c.id + '" maxlength="60" placeholder="Name of the person who received the item" aria-label="Name of the person who received the item">' +
        '<button type="button" class="btn btn-success" data-action="return" data-id="' + c.id + '">Mark as returned</button>' +
        '<button type="button" class="btn btn-danger" data-action="reject" data-id="' + c.id + '">Reject</button>' + err + "</div>";
    }
    if (c.status === "returned") {
      return '<p class="final-note">✅ Handed over to <strong>' + escapeHTML(c.receivedBy || "the owner") + "</strong>" +
        (c.returnedAt ? " on " + escapeHTML(formatDateTime(c.returnedAt)) : "") + ".</p>";
    }
    return '<p class="final-note">This claim was rejected.</p>';
  }

  function renderClaim(c) {
    var finderInfo = CCStore.getPrivate(c.itemId);
    var finderDetail = finderInfo && finderInfo.privateDetail
      ? escapeHTML(finderInfo.privateDetail)
      : '<span class="muted-text">Not available</span>';

    return '<article class="claim-item">' +
      '<div class="claim-head"><div>' +
        '<a class="claim-title" href="item.html?id=' + encodeURIComponent(c.itemId) + '">' + escapeHTML(c.itemTitle) + "</a>" +
        "<small>" + escapeHTML(c.id) + " · " + escapeHTML(formatDateTime(c.createdAt)) + "</small></div>" +
        '<span class="pill-status pill-' + c.status + '">' + STATUS_TEXT[c.status] + "</span></div>" +
      '<div class="claim-grid">' +
        "<div><small>Claimant</small><strong>" + escapeHTML(c.claimantName) + "</strong></div>" +
        "<div><small>Scholar number</small><strong>" + escapeHTML(c.scholarNumber) + "</strong></div>" +
        "<div><small>Contact</small><strong>" + escapeHTML(c.contact) + "</strong></div>" +
      "</div>" +
      '<div class="claim-block"><small>Why they say it is theirs</small><p>' + escapeHTML(c.reason) + "</p></div>" +
      '<div class="verify">' +
        '<div class="claimant-side"><small>Claimant\'s private detail</small><p>' + escapeHTML(c.privateDetail) + "</p></div>" +
        '<div class="finder-side"><small>Finder\'s recorded detail</small><p>' + finderDetail + "</p></div>" +
      "</div>" +
      actionsFor(c) + "</article>";
  }

  function renderClaims() {
    var gate = ensureGate();

    if (!CCStore.isSignedIn()) {
      el("claimTabs").hidden = true;
      el("claimList").hidden = true;
      el("claimEmpty").hidden = true;
      gate.innerHTML = signInBox("Sign in as the finder of an item to review the claims on it.");
      gate.hidden = false;
      return;
    }

    gate.hidden = true;
    el("claimTabs").hidden = false;

    var all = managedClaims().sort(newestFirst);
    renderTabs(all);

    var list = activeTab === "all" ? all : all.filter(function (c) { return c.status === activeTab; });
    el("claimList").innerHTML = list.map(renderClaim).join("");
    el("claimEmpty").hidden = list.length > 0;
    el("claimList").hidden = list.length === 0;
  }

  function refresh() {
    renderStats();
    renderCategories();
    renderMyReports();
    renderMyClaims();
    renderClaims();
  }

  /* ---------- Actions ---------- */
  async function onApprove(claim) {
    var clash = CCStore.getClaimsForItem(claim.itemId).some(function (c) {
      return c.id !== claim.id && c.status === "approved";
    });
    if (clash) {
      errors[claim.id] = "Another claim on this item is already approved. Reject it first, or finish that handover.";
      return;
    }
    delete errors[claim.id];
    await CCStore.updateClaim(claim.id, { status: "approved" });
  }

  async function onReject(claim) {
    if (!confirm("Reject this claim by " + claim.claimantName + "?")) return;
    delete errors[claim.id];
    await CCStore.updateClaim(claim.id, { status: "rejected" });
  }

  async function onReturn(claim) {
    var input = el("recv-" + claim.id);
    var receiver = input ? input.value.trim() : "";
    if (receiver.length < 2) {
      errors[claim.id] = "Enter the name of the person who received the item.";
      return;
    }
    delete errors[claim.id];
    await CCStore.updateClaim(claim.id, {
      status: "returned",
      receivedBy: receiver,
      returnedAt: new Date().toISOString()
    });
    // Once handed over, any other open claims on this item can no longer succeed
    var others = CCStore.getClaimsForItem(claim.itemId).filter(function (o) {
      return o.id !== claim.id && (o.status === "pending" || o.status === "approved");
    });
    for (var i = 0; i < others.length; i++) {
      await CCStore.updateClaim(others[i].id, { status: "rejected" });
    }
  }

  async function onClaimListClick(event) {
    var btn = event.target.closest("button[data-action]");
    if (!btn || busy) return;
    var claim = findClaim(btn.dataset.id);
    if (!claim) return;

    busy = true;
    btn.disabled = true;
    try {
      var action = btn.dataset.action;
      if (action === "approve") await onApprove(claim);
      if (action === "reject") await onReject(claim);
      if (action === "return") await onReturn(claim);
    } catch (e) {
      console.error(e);
      errors[claim.id] = "Could not save the change (" + (e.code || e.message) + "). Please try again.";
    }
    busy = false;
    refresh();
  }

  function init() {
    var note = document.querySelector(".demo-note");
    if (note) {
      note.textContent = "🔒 You only see claims on items you reported. Claimants' private details are never shown publicly. The admin account can see all claims.";
    }

    el("claimTabs").addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-tab]");
      if (!btn) return;
      activeTab = btn.dataset.tab;
      renderClaims();
    });
    el("claimList").addEventListener("click", onClaimListClick);
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-signin]")) CCStore.signIn();
    });

    refresh();
  }

  CCReady.then(init);
})();
