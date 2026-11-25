/* Campus Connect - Firebase data layer (Firestore + Google sign-in).
   Replaces js/store.js. Reads work from a local copy; writes go to the database. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, updateDoc, query, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.CC_FIREBASE = true;

// The admin's Gmail (lowercase). Must match the one in the Firestore rules.
const ADMIN_EMAILS = ["aniket1302saini@gmail.com"];

// These values only identify the project. They are not secrets; the rules protect the data.
const firebaseConfig = {
  apiKey: "AIzaSyCQQ0Re7U0vwNntxb_M-cZqryQiJKgcR3M",
  authDomain: "campus-connect-58dc3.firebaseapp.com",
  projectId: "campus-connect-58dc3",
  storageBucket: "campus-connect-58dc3.firebasestorage.app",
  messagingSenderId: "596415183167",
  appId: "1:596415183167:web:061afefb26239fdc7b3b8a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Keep a copy of the demo items (from data.js) for the one-time seeding
const DEMO_ITEMS = SAMPLE_ITEMS.slice();

// Private details attached to the demo "found" items so claim verification can be demonstrated
const DEMO_SECRETS = {
  "itm-001": "A small cat sticker on the back of the lanyard",
  "itm-003": "A tiny star sticker under the charging case lid",
  "itm-005": "Initials RK scratched under the base",
  "itm-007": "A boarding pass used as a bookmark near page 40",
  "itm-009": "A name tag sewn inside the hood",
  "itm-011": "A red sticker inside the case and a scratch on the left lens"
};

let currentUser = null;
let claims = [];
let privateById = {};
let offline = false;

function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.map(function (e) { return e.toLowerCase(); }).indexOf(user.email.toLowerCase()) !== -1;
}

function firstName(user) {
  return (user.displayName || user.email || "you").split(" ")[0];
}

function showBanner(text) {
  var bar = document.createElement("div");
  bar.setAttribute("style", "background:#fef3c7;color:#78350f;text-align:center;padding:8px 12px;font-size:0.88rem");
  bar.textContent = text;
  document.body.insertBefore(bar, document.body.firstChild);
}

/* ---------- Sign in / out ---------- */
async function signInFlow() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    window.location.reload();
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
    var msg = "Sign-in failed (" + e.code + ").";
    if (e.code === "auth/unauthorized-domain") msg += " This website address is not added under Authentication > Settings > Authorized domains.";
    if (e.code === "auth/operation-not-supported-in-this-environment") msg += " Open the live website link, not the file on your computer.";
    if (e.code === "auth/popup-blocked") msg += " Allow pop-ups for this site and try again.";
    alert(msg);
  }
}

async function onAuthClick() {
  if (currentUser) {
    await signOut(auth);
    window.location.reload();
  } else {
    await signInFlow();
  }
}

function setupAuthButton() {
  var nav = document.getElementById("navLinks");
  if (!nav) return null;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.id = "authBtn";
  btn.className = "btn btn-outline";
  btn.textContent = "Sign in with Google";
  btn.addEventListener("click", onAuthClick);
  nav.appendChild(btn);
  return btn;
}

/* ---------- Loading data ---------- */
async function loadItems() {
  var snap = await getDocs(collection(db, "items"));
  SAMPLE_ITEMS.length = 0;
  snap.forEach(function (d) {
    SAMPLE_ITEMS.push(Object.assign({}, d.data(), { id: d.id }));
  });
}

async function loadPrivate(user) {
  privateById = {};
  if (!user) return;
  var source = isAdminUser(user)
    ? collection(db, "itemPrivate")
    : query(collection(db, "itemPrivate"), where("reporterUid", "==", user.uid));
  var snap = await getDocs(source);
  snap.forEach(function (d) { privateById[d.id] = d.data(); });
}

async function loadClaims(user) {
  claims = [];
  if (!user) return;
  var seen = {};
  var sources = isAdminUser(user)
    ? [collection(db, "claims")]
    : [
        query(collection(db, "claims"), where("claimantUid", "==", user.uid)),
        query(collection(db, "claims"), where("finderUid", "==", user.uid))
      ];
  for (var i = 0; i < sources.length; i++) {
    var snap = await getDocs(sources[i]);
    snap.forEach(function (d) {
      if (!seen[d.id]) {
        seen[d.id] = true;
        claims.push(Object.assign({}, d.data(), { id: d.id }));
      }
    });
  }
}

// An item's public status follows its claims: approved = handover pending, returned = returned
async function syncItemStatus(itemId) {
  var item = SAMPLE_ITEMS.find(function (i) { return i.id === itemId; });
  if (!item) return;
  var related = claims.filter(function (c) { return c.itemId === itemId; });
  var status = "open";
  if (related.some(function (c) { return c.status === "returned"; })) status = "returned";
  else if (related.some(function (c) { return c.status === "approved"; })) status = "pending";
  if (item.status !== status) {
    await updateDoc(doc(db, "items", itemId), { status: status });
    item.status = status;
  }
}

/* ---------- Public API used by the pages ---------- */
window.CCStore = {
  getUser: function () { return currentUser; },
  isSignedIn: function () { return !!currentUser; },
  isAdmin: function () { return isAdminUser(currentUser); },
  isOffline: function () { return offline; },
  signIn: signInFlow,

  isMine: function (item) {
    return !!currentUser && item.reporterUid === currentUser.uid;
  },

  getPrivate: function (itemId) {
    return privateById[itemId] || null;
  },

  getAllClaims: function () {
    return claims.slice();
  },

  getClaimsForItem: function (itemId) {
    return claims.filter(function (c) { return c.itemId === itemId; });
  },

  // Claims made by the signed-in person
  getMyClaims: function (itemId) {
    return claims.filter(function (c) {
      return c.itemId === itemId && currentUser && c.claimantUid === currentUser.uid;
    });
  },

  addReport: async function (publicItem, privateInfo) {
    if (!currentUser) throw new Error("not-signed-in");
    var item = Object.assign({}, publicItem, { reporterUid: currentUser.uid, createdAt: Date.now() });
    var priv = Object.assign({}, privateInfo, { reporterUid: currentUser.uid });
    var batch = writeBatch(db);
    batch.set(doc(db, "items", item.id), item);
    batch.set(doc(db, "itemPrivate", item.id), priv);
    await batch.commit();
    SAMPLE_ITEMS.push(item);
    privateById[item.id] = priv;
    return true;
  },

  addClaim: async function (claim) {
    if (!currentUser) throw new Error("not-signed-in");
    var item = SAMPLE_ITEMS.find(function (i) { return i.id === claim.itemId; });
    if (!item || !item.reporterUid) throw new Error("item-not-found");
    var data = Object.assign({}, claim, { claimantUid: currentUser.uid, finderUid: item.reporterUid });
    await setDoc(doc(db, "claims", claim.id), data);
    claims.push(data);
    return true;
  },

  updateClaim: async function (claimId, changes) {
    await updateDoc(doc(db, "claims", claimId), changes);
    var itemId = null;
    claims.forEach(function (c) {
      if (c.id === claimId) {
        Object.assign(c, changes);
        itemId = c.itemId;
      }
    });
    if (itemId) await syncItemStatus(itemId);
    return true;
  },

  // One-time: saves the 12 demo items to the database (admin only, safe to run twice)
  seedDemo: async function () {
    if (!isAdminUser(currentUser)) throw new Error("admin-only");
    var batch = writeBatch(db);
    DEMO_ITEMS.forEach(function (item) {
      batch.set(doc(db, "items", item.id), Object.assign({}, item, {
        reporterUid: currentUser.uid,
        createdAt: Date.now()
      }));
      if (item.type === "found") {
        batch.set(doc(db, "itemPrivate", item.id), {
          fullName: item.reporter,
          scholarNumber: "DEMO",
          contact: "demo@example.com",
          privateDetail: DEMO_SECRETS[item.id] || "Demo detail",
          reporterUid: currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
    });
    await batch.commit();
    return DEMO_ITEMS.length;
  }
};

/* ---------- Start up ---------- */
var authReady = new Promise(function (resolve) {
  onAuthStateChanged(auth, function (user) { resolve(user); });
});

(async function start() {
  try {
    var btn = setupAuthButton();
    currentUser = await authReady;
    if (btn) {
      btn.textContent = currentUser ? "Sign out (" + firstName(currentUser) + ")" : "Sign in with Google";
    }

    try {
      await loadItems();
    } catch (e) {
      offline = true;
      console.error("Could not load items:", e);
      showBanner("The live database could not be reached. Showing demo data only.");
    }

    try {
      await loadPrivate(currentUser);
      await loadClaims(currentUser);
    } catch (e) {
      console.error("Could not load private data or claims:", e);
    }
  } finally {
    if (window.__ccResolve) window.__ccResolve();
  }
})();
