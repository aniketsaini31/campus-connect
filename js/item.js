/* Campus Connect - Item details page and claim form (Firebase version) */
(function () {
  "use strict";

  var FIELD_IDS = ["c-name", "c-scholar", "c-contact", "c-reason", "c-detail", "c-confirm"];

  var STATUS_TEXT = {
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    returned: "Returned"
  };

  var item = null;

  function el(id) { return document.getElementById(id); }
  function val(id) { return el(id).value.trim(); }

  function findItem() {
    var id = new URLSearchParams(window.location.search).get("id");
    for (var i = 0; i < SAMPLE_ITEMS.length; i++) {
      if (SAMPLE_ITEMS[i].id === id) return SAMPLE_ITEMS[i];
    }
    return null;
  }

  function longDate(dateStr) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });
  }

  function renderDetails() {
    var st = statusInfo(item);
    var isLost = item.type === "lost";
    el("pageTitle").textContent = item.title;
    document.title = item.title + " - Campus Connect";

    el("itemDetails").innerHTML =
      '<div class="detail-top">' +
        '<span class="badge ' + (isLost ? "badge-lost" : "badge-found") + '">' + (isLost ? "Lost" : "Found") + "</span>" +
        '<span class="status ' + st.cls + '">' + st.label + "</span>" +
      "</div>" +
      '<div class="detail-head">' +
        '<div class="detail-icon" aria-hidden="true">' + categoryIcon(item.category) + "</div>" +
        "<div><h2>" + escapeHTML(item.title) + "</h2>" +
        '<p class="item-meta">' + escapeHTML(item.category) + "</p></div>" +
      "</div>" +
      '<p class="detail-desc">' + escapeHTML(item.description) + "</p>" +
      '<div class="meta-grid">' +
        '<div class="meta-box"><small>Location</small><strong>📍 ' + escapeHTML(item.location) + "</strong></div>" +
        '<div class="meta-box"><small>Date ' + (isLost ? "lost" : "found") + "</small><strong>" + escapeHTML(longDate(item.date)) + "</strong></div>" +
        '<div class="meta-box"><small>Reported by</small><strong>' + escapeHTML(item.reporter) + "</strong></div>" +
        '<div class="meta-box"><small>Reference</small><strong>' + escapeHTML(item.id) + "</strong></div>" +
      "</div>" +
      '<p class="privacy-note">🔒 For privacy, contact details, scholar numbers and identifying details are never shown on public listings.</p>';
  }

  function hasActiveClaim() {
    return CCStore.getMyClaims(item.id).some(function (c) {
      return c.status === "pending" || c.status === "approved";
    });
  }

  function renderClaimArea() {
    var info = el("claimInfo");
    var form = el("claimForm");
    form.hidden = true;

    if (item.status === "returned") {
      info.innerHTML =
        '<div class="info-box"><div class="big" aria-hidden="true">🎉</div><h3>Returned to its owner</h3>' +
        "<p>This item has been handed over and the case is closed. Thank you for helping.</p>" +
        '<a href="browse.html" class="btn btn-outline">Browse other items</a></div>';
      return;
    }

    if (item.type === "lost") {
      info.innerHTML =
        '<div class="info-box"><div class="big" aria-hidden="true">🙌</div><h3>Did you find this?</h3>' +
        "<p>Report it as a found item and add a private detail. The owner will then be able to claim it and the claim will be verified.</p>" +
        '<a href="report.html?type=found" class="btn btn-primary">Report a found item</a></div>';
      return;
    }

    if (!CCStore.isSignedIn()) {
      info.innerHTML =
        '<div class="info-box"><div class="big" aria-hidden="true">🔐</div><h3>Sign in to claim</h3>' +
        "<p>Sign in with Google so the finder can verify who is claiming this item.</p>" +
        '<button type="button" class="btn btn-primary" id="signInBtn">Sign in with Google</button></div>';
      el("signInBtn").addEventListener("click", function () { CCStore.signIn(); });
      return;
    }

    if (CCStore.isMine(item)) {
      info.innerHTML =
        '<div class="info-box"><div class="big" aria-hidden="true">📋</div><h3>You reported this item</h3>' +
        "<p>Claims on it appear in your dashboard, where you can verify and approve them.</p>" +
        '<a href="dashboard.html" class="btn btn-primary">Open dashboard</a></div>';
      return;
    }

    if (hasActiveClaim()) {
      info.innerHTML =
        '<div class="info-box"><div class="big" aria-hidden="true">⏳</div><h3>Your claim is in progress</h3>' +
        "<p>The finder will check your private detail. You can track the status below.</p></div>";
      return;
    }

    info.innerHTML = "";
    form.hidden = false;
    var user = CCStore.getUser();
    if (user && user.displayName && !el("c-name").value) el("c-name").value = user.displayName;
  }

  function renderMyClaims() {
    var box = el("myClaims");
    var mine = CCStore.getMyClaims(item.id);
    if (!mine.length) { box.hidden = true; return; }

    var html = "<h3>Your claims on this item</h3>";
    mine.forEach(function (c) {
      var extra = "";
      if (c.status === "approved") extra = "<small>Approved. The finder will contact you to arrange the handover.</small>";
      if (c.status === "rejected") extra = "<small>The finder could not verify this claim.</small>";
      if (c.status === "returned") extra = "<small>Received by " + escapeHTML(c.receivedBy || "the owner") + ".</small>";
      html +=
        '<div class="my-claim"><div class="row">' +
        "<strong>" + escapeHTML(c.id) + "</strong>" +
        '<span class="pill-status pill-' + c.status + '">' + STATUS_TEXT[c.status] + "</span></div>" +
        "<small>Submitted " + escapeHTML(new Date(c.createdAt).toLocaleString("en-IN")) + "</small>" +
        extra + "</div>";
    });
    box.innerHTML = html;
    box.hidden = false;
  }

  function setError(id, message) {
    var box = el("err-" + id);
    box.textContent = message || "";
    if (el(id).type !== "checkbox") el(id).classList.toggle("invalid", !!message);
  }

  function clearErrors() {
    FIELD_IDS.forEach(function (id) { setError(id, ""); });
  }

  function validate() {
    var ok = true;
    function fail(id, message) { setError(id, message); ok = false; }
    clearErrors();

    if (val("c-name").length < 2) fail("c-name", "Enter your full name.");

    if (!/^[A-Za-z0-9]{5,15}$/.test(val("c-scholar"))) {
      fail("c-scholar", "Enter a valid scholar number (letters and digits only).");
    }

    var contact = val("c-contact");
    var isEmail = /^\S+@\S+\.\S+$/.test(contact);
    var digits = contact.replace(/\D/g, "").length;
    if (!isEmail && digits < 10) fail("c-contact", "Enter a valid email or a 10-digit phone number.");

    if (val("c-reason").length < 15) fail("c-reason", "Explain why it is yours (at least 15 characters).");
    if (val("c-detail").length < 3) fail("c-detail", "Add a private detail that only the real owner would know.");
    if (!el("c-confirm").checked) fail("c-confirm", "Please confirm the item is yours.");

    return ok;
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      var firstBad = el("claimForm").querySelector(".invalid");
      if (firstBad) firstBad.focus();
      return;
    }

    var claim = {
      id: "clm-" + Date.now(),
      itemId: item.id,
      itemTitle: item.title,
      claimantName: val("c-name"),
      scholarNumber: val("c-scholar"),
      contact: val("c-contact"),
      reason: val("c-reason"),
      privateDetail: val("c-detail"),
      status: "pending",
      receivedBy: "",
      createdAt: new Date().toISOString()
    };

    var btn = el("claimForm").querySelector(".submit-btn");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
      await CCStore.addClaim(claim);
    } catch (e) {
      console.error(e);
      alert("Could not submit your claim (" + (e.code || e.message) + "). Please try again.");
      btn.disabled = false;
      btn.textContent = "Submit claim";
      return;
    }

    btn.disabled = false;
    btn.textContent = "Submit claim";
    el("claimForm").reset();

    var success = el("claimSuccess");
    success.innerHTML =
      "<strong>Claim submitted.</strong> Your reference is <strong>" + escapeHTML(claim.id) +
      "</strong>. The finder will check your private detail and update the status below.";
    success.hidden = false;

    renderClaimArea();
    renderMyClaims();
  }

  function init() {
    item = findItem();
    if (!item) {
      el("itemLayout").hidden = true;
      el("notFound").hidden = false;
      el("pageTitle").textContent = "Item not found";
      return;
    }

    renderDetails();
    renderClaimArea();
    renderMyClaims();

    FIELD_IDS.forEach(function (id) {
      el(id).addEventListener("input", function () { setError(id, ""); });
      el(id).addEventListener("change", function () { setError(id, ""); });
    });
    el("claimForm").addEventListener("submit", onSubmit);
  }

  CCReady.then(init);
})();
