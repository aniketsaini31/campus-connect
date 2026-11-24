/* Campus Connect - Report form */
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

  // Update labels when switching between Lost and Found
  function applyType() {
    var type = getType();
    var isFound = type === "found";
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

    var title = val("title");
    if (title.length < 3) fail("title", "Enter the item name (at least 3 characters).");

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

  function onSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      var firstBad = form.querySelector(".invalid");
      if (firstBad) firstBad.focus();
      return;
    }

    var type = getType();
    var id = "itm-" + Date.now();

    // Public part: shown on listings
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

    // Private part: never shown on listings
    var privateInfo = {
      fullName: val("reporterName"),
      scholarNumber: val("scholar"),
      contact: val("contact"),
      privateDetail: val("privateDetail"),
      createdAt: new Date().toISOString()
    };

    var saved = CCStore.addReport(publicItem, privateInfo);
    if (!saved) {
      formError.textContent = "Could not save your report. Check that your browser allows site storage and try again.";
      formError.hidden = false;
      return;
    }

    form.hidden = true;
    successText.textContent =
      "Your " + type + " report for \"" + publicItem.title + "\" has been saved (reference " + id +
      "). Your name, scholar number, contact and private detail are not shown publicly.";
    successBox.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function init() {
    el("date").max = todayString();
    el("date").value = todayString();

    var wanted = new URLSearchParams(window.location.search).get("type");
    if (wanted === "found") form.querySelector('input[value="found"]').checked = true;

    form.querySelectorAll('input[name="type"]').forEach(function (radio) {
      radio.addEventListener("change", applyType);
    });

    // Remove an error as soon as the person starts fixing the field
    FIELD_IDS.forEach(function (id) {
      el(id).addEventListener("input", function () { setError(id, ""); });
      el(id).addEventListener("change", function () { setError(id, ""); });
    });

    form.addEventListener("submit", onSubmit);
    applyType();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
