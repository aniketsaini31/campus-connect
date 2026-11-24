/* Campus Connect - temporary storage (this browser only).
   On Thursday this file is replaced by Firebase so reports are shared with everyone.
   Public details and private details are kept in separate places. */
(function () {
  "use strict";

  var ITEMS_KEY = "cc_reported_items_v1";
  var PRIVATE_KEY = "cc_private_details_v1";

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  window.CCStore = {
    // publicItem: details shown on listings. privateInfo: details kept hidden.
    addReport: function (publicItem, privateInfo) {
      var list = load(ITEMS_KEY, []);
      var secrets = load(PRIVATE_KEY, {});
      list.push(publicItem);
      secrets[publicItem.id] = privateInfo;
      return save(ITEMS_KEY, list) && save(PRIVATE_KEY, secrets);
    }
  };

  // Add this browser's saved reports to the sample list so Home and Browse show them
  if (typeof SAMPLE_ITEMS !== "undefined") {
    load(ITEMS_KEY, []).forEach(function (item) {
      SAMPLE_ITEMS.push(item);
    });
  }
})();
