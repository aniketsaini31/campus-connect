/* Campus Connect - temporary storage (this browser only).
   On Thursday this file is replaced by Firebase so data is shared with everyone.
   Public details, private details and claims are kept in separate places. */
(function () {
  "use strict";

  var ITEMS_KEY = "cc_reported_items_v1";
  var PRIVATE_KEY = "cc_private_details_v1";
  var CLAIMS_KEY = "cc_claims_v1";
  var MY_CLAIMS_KEY = "cc_my_claim_ids_v1";

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

  // Item status follows its claims: any active claim = pending, a returned claim = returned
  function applyClaimStatuses() {
    if (typeof SAMPLE_ITEMS === "undefined") return;
    var claims = load(CLAIMS_KEY, []);
    SAMPLE_ITEMS.forEach(function (item) {
      var mine = claims.filter(function (c) { return c.itemId === item.id; });
      if (!mine.length) return;
      if (mine.some(function (c) { return c.status === "returned"; })) {
        item.status = "returned";
      } else if (mine.some(function (c) { return c.status === "pending" || c.status === "approved"; })) {
        item.status = "pending";
      } else {
        item.status = "open";
      }
    });
  }

  window.CCStore = {
    addReport: function (publicItem, privateInfo) {
      var list = load(ITEMS_KEY, []);
      var secrets = load(PRIVATE_KEY, {});
      list.push(publicItem);
      secrets[publicItem.id] = privateInfo;
      return save(ITEMS_KEY, list) && save(PRIVATE_KEY, secrets);
    },

    getPrivate: function (itemId) {
      return load(PRIVATE_KEY, {})[itemId] || null;
    },

    addClaim: function (claim) {
      var claims = load(CLAIMS_KEY, []);
      var mine = load(MY_CLAIMS_KEY, []);
      claims.push(claim);
      mine.push(claim.id);
      var ok = save(CLAIMS_KEY, claims) && save(MY_CLAIMS_KEY, mine);
      applyClaimStatuses();
      return ok;
    },

    getAllClaims: function () {
      return load(CLAIMS_KEY, []);
    },

    getClaimsForItem: function (itemId) {
      return load(CLAIMS_KEY, []).filter(function (c) { return c.itemId === itemId; });
    },

    // Claims made from this browser (what the claimant is allowed to track)
    getMyClaims: function (itemId) {
      var mine = load(MY_CLAIMS_KEY, []);
      return load(CLAIMS_KEY, []).filter(function (c) {
        return c.itemId === itemId && mine.indexOf(c.id) !== -1;
      });
    },

    updateClaim: function (claimId, changes) {
      var claims = load(CLAIMS_KEY, []);
      claims.forEach(function (c) {
        if (c.id === claimId) {
          Object.keys(changes).forEach(function (k) { c[k] = changes[k]; });
        }
      });
      var ok = save(CLAIMS_KEY, claims);
      applyClaimStatuses();
      return ok;
    }
  };

  // Add this browser's saved reports to the sample list so every page shows them
  if (typeof SAMPLE_ITEMS !== "undefined") {
    load(ITEMS_KEY, []).forEach(function (item) {
      SAMPLE_ITEMS.push(item);
    });
    applyClaimStatuses();
  }
})();
