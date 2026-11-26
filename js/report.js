/* Campus Connect - Report form (Firebase version) */
(function () {
  "use strict";

  var form = document.getElementById("reportForm");
  var successBox = document.getElementById("successBox");
  var successText = document.getElementById("successText");
  var formError = document.getElementById("formError");
  var optLost = document.getElementById("optLost");
  var optFound = document.getElementById("optFound");

  var FIELD_IDS = ["title", "category", "location", "date", "description", "reporterName", "scholar", "contact", "privateDetail"];

  function el(id) { return document.getElementById(id); }
  function val(id) { return el(id).value.trim(); }

  function todayString() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function getType() {
    return form.querySelector('input[name="type"]:checked').value;
  }

  // Shown instead of the form when nobody is signed in
  function showGate() {
    var gate = document.getElementById("signinGate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "signinGate";
      gate.className = "form-card";
      gate.style.textAlign = "center";
      gate.innerHTML =
        '<div style="font-size:2.6rem" aria-hidden="true">🔐</div>' +
        "<h2>Sign in to report an item</h2>" +
        '<p style="color:var(--muted);margin:8px auto 20px;max-width:440px">Signing in with Google lets finders and owners verify each other and keeps your private details safe. Your name, scholar number and contact are never shown publicly.</p>' +
        '<button type="button" class="btn btn-primary btn-lg" id="gateBtn">Sign in with Google</button>';
      form.parentNode.insertBefore(gate, form);
      document.getElementById("gateBtn").addEventListener("click", function () { CCStore.signIn(); });
    }
    form.hidden = true;
    gate.hidden = false;
  }

  function applyType() {
    var isFound = getType() === "found";
    optLost.classList.toggle("selected", !isFound);
    optFound.classList.toggle("selected", isFound);
    el("dateWord").textContent = isFound ? "found" : "lost";
    el("privateReq").textContent = isFound ? "(required)" : "(optional)";
    el("privateHint").textContent = isFound
      ? "Required. Something only the real owner would know, for example the phone wallpaper, a name written inside, or what is in the bag. You will use it to check claims. It stays hidden."
      : "Optional. Something only you would know about your item. It stays hidden.";
    el("privateDetail").placeholder = isFound
      ? "e.g. Sticker inside the case, or the lock screen photo"
      : "e.g. Name written inside, a scratch on one corner";
  }

  function setError(id, message) {
    var input = el(id);
    var box = el("err-" + id);
    box.textContent = message || "";
    input.classList.toggle("invalid", !!message);
  }

  function clearErrors() {
    FIELD_IDS.forEach(function (id) { setError(id, ""); });
    formError.hidden = true;
  }

  function validate() {
    var ok = true;
    function fail(id, message) { setError(id, message); ok = false; }

    clearErrors();

    if (val("title").length < 3) fail("title", "Enter the item name (at least 3 characters).");
    if (!val("category")) fail("category", "Choose a category.");
    if (!val("location")) fail("location", "Choose a location.");

    var date = val("date");
    if (!date) fail("date", "Choose a date.");
    else if (date > todayString()) fail("date", "The date cannot be in the future.");

    if (val("description").length < 10) fail("description", "Add a short description (at least 10 characters).");
    if (val("reporterName").length < 2) fail("reporterName", "Enter your full name.");

    if (!/^[A-Za-z0-9]{5,15}$/.test(val("scholar"))) {
      fail("scholar", "Enter a valid scholar number (letters and digits only).");
    }

    var contact = val("contact");
    var looksLikeEmail = /^\S+@\S+\.\S+$/.test(contact);
    var digitCount = contact.replace(/\D/g, "").length;
    if (!looksLikeEmail && digitCount < 10) fail("contact", "Enter a valid email or a 10-digit phone number.");

    if (getType() === "found" && val("privateDetail").length < 3) {
      fail("privateDetail", "For found items, add a private detail so you can verify the real owner.");
    }
    return ok;
  }

  // "Aniket Saini" becomes "Aniket S." for public display
  function publicName(fullName) {
    var parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return parts[0] || "Student";
    return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!CCStore.isSignedIn()) { showGate(); return; }

    if (!validate()) {
      var firstBad = form.querySelector(".invalid");
      if (firstBad) firstBad.focus();
      return;
    }

    var type = getType();
    var id = "itm-" + Date.now();

    var publicItem = {
      id: id,
      type: type,
      title: val("title"),
      category: val("category"),
      location: val("location"),
      date: val("date"),
      description: val("description"),
      status: "open",
      reporter: publicName(val("reporterName"))
    };

    var privateInfo = {
      fullName: val("reporterName"),
      scholarNumber: val("scholar"),
      contact: val("contact"),
      privateDetail: val("privateDetail"),
      createdAt: new Date().toISOString()
    };

    var btn = form.querySelector(".submit-btn");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
      await CCStore.addReport(publicItem, privateInfo);
    } catch (e) {
      console.error(e);
      var why = e && e.code === "permission-denied"
        ? " (permission denied: check that the Firestore rules are published)"
        : "";
      formError.textContent = "Could not save your report" + why + ". Please try again.";
      formError.hidden = false;
      btn.disabled = false;
      btn.textContent = "Submit report";
      return;
    }

    form.hidden = true;
    successText.textContent =
      "Your " + type + " report for \"" + publicItem.title + "\" is now live for everyone on campus (reference " + id +
      "). Your name, scholar number, contact and private detail are not shown publicly.";
    successBox.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function init() {
    if (!CCStore.isSignedIn()) {
      showGate();
      return;
    }

    var user = CCStore.getUser();
    if (user && user.displayName && !el("reporterName").value) {
      el("reporterName").value = user.displayName;
    }

    el("date").max = todayString();
    el("date").value = todayString();

    var wanted = new URLSearchParams(window.location.search).get("type");
    if (wanted === "found") form.querySelector('input[value="found"]').checked = true;

    form.querySelectorAll('input[name="type"]').forEach(function (radio) {
      radio.addEventListener("change", applyType);
    });

    FIELD_IDS.forEach(function (id) {
      el(id).addEventListener("input", function () { setError(id, ""); });
      el(id).addEventListener("change", function () { setError(id, ""); });
    });

    form.addEventListener("submit", onSubmit);
    applyType();
  }

  CCReady.then(init);
})();
