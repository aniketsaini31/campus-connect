/* Campus Connect - Browse page: search, filters and results */
(function () {
  "use strict";

  // Today this reads the sample data. Later we swap this one function
  // to read real reports from the database.
  function getItems() {
    return SAMPLE_ITEMS;
  }

  var state = { q: "", type: "all", category: "all", location: "all", status: "all" };

  var searchInput = document.getElementById("searchInput");
  var typeTabs = document.getElementById("typeTabs");
  var categoryFilter = document.getElementById("categoryFilter");
  var locationFilter = document.getElementById("locationFilter");
  var statusFilter = document.getElementById("statusFilter");
  var resetBtn = document.getElementById("resetBtn");
  var emptyResetBtn = document.getElementById("emptyResetBtn");
  var grid = document.getElementById("itemsGrid");
  var emptyState = document.getElementById("emptyState");
  var resultCount = document.getElementById("resultCount");

  // Fill a dropdown with the unique values found in the data
  function fillSelect(select, values) {
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function uniqueSorted(field) {
    var seen = {};
    getItems().forEach(function (item) { seen[item[field]] = true; });
    return Object.keys(seen).sort();
  }

  function matches(item) {
    if (state.type !== "all" && item.type !== state.type) return false;
    if (state.category !== "all" && item.category !== state.category) return false;
    if (state.location !== "all" && item.location !== state.location) return false;
    if (state.status !== "all" && item.status !== state.status) return false;
    if (state.q) {
      var text = (item.title + " " + item.description + " " + item.category).toLowerCase();
      if (text.indexOf(state.q) === -1) return false;
    }
    return true;
  }

  function render() {
    var all = getItems();
    var list = all.filter(matches).sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    grid.innerHTML = list.map(renderItemCard).join("");
    emptyState.hidden = list.length > 0;
    grid.hidden = list.length === 0;

    resultCount.textContent =
      "Showing " + list.length + " of " + all.length + " item" + (all.length === 1 ? "" : "s");
  }

  function setActiveTab(type) {
    var buttons = typeTabs.querySelectorAll(".seg");
    buttons.forEach(function (btn) {
      var active = btn.dataset.type === type;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function resetFilters() {
    state = { q: "", type: "all", category: "all", location: "all", status: "all" };
    searchInput.value = "";
    categoryFilter.value = "all";
    locationFilter.value = "all";
    statusFilter.value = "all";
    setActiveTab("all");
    render();
  }

  function init() {
    fillSelect(categoryFilter, uniqueSorted("category"));
    fillSelect(locationFilter, uniqueSorted("location"));

    // Open directly on Lost or Found if the link says so (browse.html?type=lost)
    var wanted = new URLSearchParams(window.location.search).get("type");
    if (wanted === "lost" || wanted === "found") {
      state.type = wanted;
      setActiveTab(wanted);
    }

    searchInput.addEventListener("input", function () {
      state.q = searchInput.value.trim().toLowerCase();
      render();
    });

    typeTabs.addEventListener("click", function (event) {
      var btn = event.target.closest(".seg");
      if (!btn) return;
      state.type = btn.dataset.type;
      setActiveTab(state.type);
      render();
    });

    categoryFilter.addEventListener("change", function () {
      state.category = categoryFilter.value;
      render();
    });
    locationFilter.addEventListener("change", function () {
      state.location = locationFilter.value;
      render();
    });
    statusFilter.addEventListener("change", function () {
      state.status = statusFilter.value;
      render();
    });

    resetBtn.addEventListener("click", resetFilters);
    emptyResetBtn.addEventListener("click", resetFilters);

    render();
  }

  CCReady.then(init);
})();
