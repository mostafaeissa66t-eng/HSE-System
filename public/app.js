// =================================== */
// CLIENT-SIDE LOGIC (app.js - Final Vercel/Proxy Version)
// =================================== */

// Vercel هيحول أي طلب لـ /api للملف الوسيط بتاعنا أوتوماتيك
const API_URL = "/api";

// --- API Call Function ---
async function callApi(action, payload) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action, payload: payload }),
        });

        const responseText = await response.text(); // Get raw text first

        if (!response.ok) {
            console.error(
                `API Error Response (${response.status}) for action ${action}:`,
                responseText,
            );
            let errorMsg = `API Error: ${response.status} ${response.statusText}`;
            try {
                const ed = JSON.parse(responseText);
                msg = ed.message || msg;
            } catch (e) {
                /* ignore */
            }
            throw new Error(errorMsg);
        }

        // Try to parse JSON response if fetch was OK
        try {
            const result = JSON.parse(responseText);
            // Check if the Apps Script itself reported an error
            if (result && result.status === "error") {
                console.error(
                    `Google Script Error for action ${action}:`,
                    result.message,
                );
                throw new Error(result.message || "خطأ من السيرفر.");
            }
            return result; // Return successful data
        } catch (parseError) {
            console.error(
                `Failed to parse JSON response from API for action ${action}:`,
                parseError,
            );
            console.error("Raw API Response:", responseText);
            throw new Error(
                `Received invalid response from server (not JSON): ${responseText.substring(0, 100)}...`,
            );
        }
    } catch (error) {
        console.error(`callApi Error for action ${action}:`, error);
        // Provide a more generic but informative error message to the user
        throw new Error(`فشل الاتصال بالخادم (${action}): ${error.message}`);
    }
}

// --- Run when DOM is ready ---
document.addEventListener("DOMContentLoaded", function () {
    // --- GLOBAL STATE ---
    let currentUser = null;
    let initialData = null;

    // --- SELECTORS ---
    const loader = document.getElementById("loader-overlay");
    const loginScreen = document.getElementById("login-screen");
    const appWrapper = document.getElementById("app-wrapper");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const content = document.getElementById("content");
    const sidebarMenu = document.getElementById("sidebar-menu");
    const logoutBtn = document.getElementById("logout-btn");

    // Form & Message Selectors
    const permitForm = document.getElementById("permit-form");
    const obsForm = document.getElementById("observation-form");
    const permitMsg = document.getElementById("permit-message");
    const obsMsg = document.getElementById("obs-message");
    const closePermitMsg = document.getElementById("close-permit-message");

    // Monitor Section Selectors
    const monitorProjectFilter = document.getElementById(
        "monitor-project-filter",
    );
    const monitorFromDate = document.getElementById("monitor-from-date");
    const monitorToDate = document.getElementById("monitor-to-date");
    const monitorOpenOnly = document.getElementById("monitor-open-only");
    const monitorSearchBtn = document.getElementById("monitor-search-btn");
    const monitorResultsTable = document.getElementById(
        "monitor-results-table",
    );
    const monitorMessage = document.getElementById("monitor-message");

    // --- Mappings for Sections ---
    const sectionIcons = {
        Dashboard: "fas fa-tachometer-alt",
        NewPermit: "fas fa-file-signature",
        ClosePermit: "fas fa-clipboard-check",
        NewObservation: "fas fa-eye",
        MonitorPermits: "fas fa-tasks",
        NewNearMiss: "fas fa-exclamation-triangle",
    };
    const sectionNames = {
        Dashboard: "لوحة التحكم",
        NewPermit: "تصريح جديد",
        ClosePermit: "إغلاق التصاريح",
        NewObservation: "ملاحظة جديدة",
        MonitorPermits: "متابعة التصاريح",
        NewNearMiss: "Near Miss",
    };

    // --- Utility Functions ---
    function showLoader(m = "...") {
        const lt = loader ? loader.querySelector("p") : null;
        if (lt) lt.textContent = m;
        if (loader) loader.style.display = "flex";
    }
    function hideLoader() {
        if (loader) loader.style.display = "none";
    }
    function showMessage(el, txt, ok) {
        if (el) {
            el.textContent = txt;
            el.className = ok ? "success-message" : "error-message";
            el.style.display = "block";
            setTimeout(() => {
                if (el) el.style.display = "none";
            }, 5000);
        } else {
            console.warn("Msg on null:", txt);
        }
    }

    // --- Login Logic ---
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const u = document.getElementById("username");
            const p = document.getElementById("password");
            if (!u || !p) return;
            if (loginError) loginError.style.display = "none";
            showLoader("جاري تسجيل الدخول...");
            try {
                const r = await callApi("checkLogin", {
                    username: u.value,
                    password: p.value,
                });
                onLoginSuccess(r);
            } catch (err) {
                onLoginFailure(err);
            }
        });
    } else {
        console.error("#login-form not found.");
    }

    function onLoginSuccess(response) {
        hideLoader();
        if (response && response.status === "success" && response.userInfo) {
            currentUser = response.userInfo;
            if (loginScreen) loginScreen.style.display = "none";
            if (appWrapper) appWrapper.style.display = "flex";
            const wu = document.getElementById("welcome-user");
            const ur = document.getElementById("user-role");
            if (wu) wu.textContent = `أهلاً، ${currentUser.username || "?"}`;
            if (ur) ur.textContent = currentUser.role || "?";
            buildSidebar(currentUser.sections);
            loadInitialData();
            const firstLink = sidebarMenu
                ? sidebarMenu.querySelector("a")
                : null;
            let initialSection = "Dashboard";
            if (firstLink && firstLink.dataset.section) {
                initialSection = firstLink.dataset.section;
            } else if (
                currentUser.sections &&
                !currentUser.sections.toUpperCase().includes("DASHBOARD")
            ) {
                const secs = String(currentUser.sections)
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s);
                if (secs.length > 0 && sectionNames[secs[0]])
                    initialSection = secs[0];
            }
            showSection(initialSection);
        } else {
            onLoginFailure({
                message:
                    (response && response.message) ||
                    "فشل تسجيل الدخول أو استلام بيانات المستخدم.",
            });
        }
    }

    function onLoginFailure(error) {
        hideLoader();
        const errorMessage =
            error && error.message
                ? error.message
                : "فشل تسجيل الدخول. خطأ غير معروف.";
        if (loginError) {
            loginError.textContent = errorMessage;
            loginError.style.display = "block";
        } else {
            alert(errorMessage);
        }
    }

    // --- Logout Logic ---
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            showLoader("تسجيل الخروج...");
            location.reload();
        });
    } else {
        console.error("#logout-btn not found.");
    }

    // --- Sidebar Toggle & Navigation ---
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    } else {
        console.error("#sidebar-toggle or #sidebar not found.");
    }
    if (content && sidebar) {
        content.addEventListener("click", function (e) {
            if (
                sidebar.classList.contains("active") &&
                sidebarToggle &&
                !sidebarToggle.contains(e.target)
            ) {
                sidebar.classList.remove("active");
            }
        });
    }

    // Function to build the sidebar menu
    function buildSidebar(sectionsString) {
        if (!sidebarMenu) {
            console.error("#sidebar-menu not found.");
            return;
        }
        sidebarMenu.innerHTML = "";
        if (!sectionsString) {
            sidebarMenu.innerHTML = "<li><a>لا أقسام</a></li>";
            return;
        }
        let sections = [];
        const cleanedString = sectionsString; // Assumes already cleaned by checkLogin
        if (cleanedString.toUpperCase() === "ALL") {
            sections = Object.keys(sectionNames);
        } else {
            sections = cleanedString
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s);
        }
        if (sections.length === 0) {
            sidebarMenu.innerHTML = "<li><a>لا أقسام متاحة</a></li>";
            return;
        }
        let isFirstLink = true;
        sections.forEach((sectionId) => {
            if (sectionNames[sectionId]) {
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.href = "#";
                a.dataset.section = sectionId;
                const icon = document.createElement("i");
                icon.className =
                    sectionIcons[sectionId] || "fas fa-question-circle";
                a.appendChild(icon);
                a.appendChild(
                    document.createTextNode(" " + sectionNames[sectionId]),
                );
                if (isFirstLink) {
                    a.classList.add("active");
                    isFirstLink = false;
                }
                a.addEventListener("click", function (e) {
                    e.preventDefault();
                    const targetId = this.dataset.section;
                    showSection(targetId);
                    sidebarMenu
                        .querySelectorAll("a")
                        .forEach((link) => link.classList.remove("active"));
                    this.classList.add("active");
                    if (window.innerWidth <= 768 && sidebar) {
                        sidebar.classList.remove("active");
                    }
                });
                li.appendChild(a);
                sidebarMenu.appendChild(li);
            } else {
                console.warn(`Section ID "${sectionId}" ignored.`);
            }
        });
    }

    // Function to show a specific page section
    function showSection(sectionId) {
        if (!sectionId) {
            console.error("showSection: no id.");
            return;
        }
        document.querySelectorAll(".page-section").forEach((section) => {
            if (section) section.style.display = "none";
        });
        const target = document.getElementById(sectionId);
        if (target) {
            target.style.display = "block";
            if (sectionId === "NewPermit") resetPermitForm();
            if (sectionId === "NewObservation") resetObservationForm();
            if (sectionId === "ClosePermit") loadOpenPermits();
            if (sectionId === "MonitorPermits") {
                populateMonitorProjects();
                if (monitorResultsTable)
                    monitorResultsTable.innerHTML =
                        "<p>حدد معايير البحث...</p>";
                if (monitorMessage) monitorMessage.style.display = "none";
            }
        } else {
            console.error(`Section "#${sectionId}" not found.`);
            const db = document.getElementById("Dashboard");
            if (db) db.style.display = "block"; // Fallback
            const dbl = sidebarMenu
                ? sidebarMenu.querySelector('a[data-section="Dashboard"]')
                : null;
            if (dbl) {
                sidebarMenu
                    .querySelectorAll("a")
                    .forEach((a) => a.classList.remove("active"));
                dbl.classList.add("active");
            }
        }
    }

    // --- Data Loading for Dropdowns ---
    async function loadInitialData() {
        if (!currentUser) {
            console.error("No user.");
            return;
        }
        showLoader("Loading config...");
        try {
            const r = await callApi("getInitialData", {
                userInfo: currentUser,
            });
            onDataLoaded(r);
        } catch (e) {
            onDataLoadFailure(e);
        }
    }
    function onDataLoaded(r) {
        hideLoader();
        if (r && r.status === "success") {
            initialData = r;
            populateDropdowns(initialData);
            const ms = document.getElementById("MonitorPermits");
            if (ms && ms.style.display !== "none") populateMonitorProjects();
        } else {
            alert("Failed config: " + (r ? r.message : "?"));
        }
    }
    function onDataLoadFailure(e) {
        hideLoader();
        alert("Failed config connect: " + e.message);
    }
    function populateDropdowns(d) {
        if (!d) return;
        const fill = (id, k) => {
            const s = document.getElementById(id);
            if (s) {
                s.innerHTML = '<option value="">اختر...</option>';
                if (d[k])
                    d[k].forEach(
                        (o) =>
                            (s.innerHTML += `<option value="${o}">${o}</option>`),
                    );
            }
        };
        fill("permit-project", "projects");
        fill("permit-type", "permitTypes");
        fill("permit-requester", "requesters");
        fill("obs-project", "projects");
    }

    // --- New Permit Form Logic ---
    function resetPermitForm() {
        if (!permitForm || !currentUser) return;
        permitForm.reset();
        const i = document.getElementById("permit-issuer");
        const ts = document.getElementById("permit-timestamp");
        const dt = document.getElementById("permit-date");
        if (i) i.value = currentUser.username;
        if (ts)
            ts.value = new Date().toLocaleString("ar-EG", {
                dateStyle: "short",
                timeStyle: "short",
            });
        if (dt) dt.valueAsDate = new Date();
    }
    if (permitForm) {
        permitForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            if (!currentUser) return;
            showLoader("Saving Permit...");
            const d = {
                projectName: document.getElementById("permit-project")?.value,
                permitDate: document.getElementById("permit-date")?.value,
                shift: document.getElementById("permit-shift")?.value,
                permitType: document.getElementById("permit-type")?.value,
                requester: document.getElementById("permit-requester")?.value,
                siteEngineer: document.getElementById("permit-engineer")?.value,
                subcontractor: document.getElementById("permit-subcontractor")
                    ?.value,
                location: document.getElementById("permit-location")?.value,
                startTime: document.getElementById("permit-starttime")?.value,
                workersCount: document.getElementById("permit-workers")?.value,
                description:
                    document.getElementById("permit-description")?.value,
            };
            if (
                !d.projectName ||
                !d.permitDate ||
                !d.shift ||
                !d.permitType ||
                !d.location ||
                !d.startTime ||
                !d.workersCount ||
                !d.description
            ) {
                hideLoader();
                showMessage(permitMsg, "Fill required.", false);
                return;
            }
            try {
                const r = await callApi("savePermit", {
                    permitObject: d,
                    userInfo: currentUser,
                });
                onPermitSaveSuccess(r);
            } catch (err) {
                onPermitSaveFailure(err);
            }
        });
    }
    function onPermitSaveSuccess(r) {
        hideLoader();
        showMessage(permitMsg, r ? r.message : "Saved.", true);
        resetPermitForm();
    }
    function onPermitSaveFailure(e) {
        hideLoader();
        showMessage(permitMsg, e.message, false);
    }

    // --- New Observation Form Logic ---
    function resetObservationForm() {
        if (!obsForm || !currentUser) return;
        obsForm.reset();
        const i = document.getElementById("obs-issuer");
        const dt = document.getElementById("obs-date");
        const tm = document.getElementById("obs-time");
        if (i) i.value = currentUser.username;
        if (dt) dt.valueAsDate = new Date();
        if (tm) tm.value = new Date().toTimeString().slice(0, 5);
    }
    if (obsForm) {
        obsForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            if (!currentUser) return;
            showLoader("Saving Obs...");
            const d = {
                projectName: document.getElementById("obs-project")?.value,
                date: document.getElementById("obs-date")?.value,
                time: document.getElementById("obs-time")?.value,
                location: document.getElementById("obs-location")?.value,
                observationType: document.getElementById("obs-type")?.value,
                description: document.getElementById("obs-description")?.value,
                correctiveAction: document.getElementById("obs-action")?.value,
            };
            if (
                !d.projectName ||
                !d.date ||
                !d.time ||
                !d.location ||
                !d.observationType ||
                !d.description
            ) {
                hideLoader();
                showMessage(obsMsg, "Fill required.", false);
                return;
            }
            try {
                const r = await callApi("saveObservation", {
                    observationObject: d,
                    userInfo: currentUser,
                });
                onObsSaveSuccess(r);
            } catch (err) {
                onObsSaveFailure(err);
            }
        });
    }
    function onObsSaveSuccess(r) {
        hideLoader();
        showMessage(obsMsg, r ? r.message : "Saved.", true);
        resetObservationForm();
    }
    function onObsSaveFailure(e) {
        hideLoader();
        showMessage(obsMsg, e.message, false);
    }

    // --- Close Permit Logic ---
    async function loadOpenPermits() {
        if (!currentUser) return;
        showLoader("Loading Permits...");
        const lc = document.getElementById("open-permits-list");
        if (lc) lc.innerHTML = "<p>Loading...</p>";
        try {
            const r = await callApi("getOpenPermits", {
                userInfo: currentUser,
            });
            onOpenPermitsLoaded(r);
        } catch (e) {
            onOpenPermitsLoadFailure(e);
        }
    }
    function onOpenPermitsLoaded(r) {
        hideLoader();
        const lc = document.getElementById("open-permits-list");
        if (!lc) return;
        if (r && r.status === "success" && r.permits) {
            if (r.permits.length === 0) {
                lc.innerHTML = "<p>No open permits.</p>";
                return;
            }
            lc.innerHTML = "";
            r.permits.forEach((p) => {
                const card = document.createElement("div");
                card.className = "permit-card";
                card.innerHTML = `<div class="permit-info"><p><strong>Proj:</strong> ${p.project || "-"}</p><p><strong>Type:</strong> ${p.type || "-"}</p><p><strong>Date:</strong> ${p.date || "-"}</p><p><strong>ID:</strong> ${p.id || "-"}</p></div><button class="btn-close" data-id="${p.id}"><i class="fas fa-check-circle"></i> Close</button>`;
                const b = card.querySelector(".btn-close");
                if (b) {
                    b.addEventListener("click", function () {
                        if (confirm(`Close ${this.dataset.id}?`))
                            handleClosePermit(this.dataset.id);
                    });
                }
                lc.appendChild(card);
            });
        } else {
            lc.innerHTML = `<p class="error-message" style="display:block;">${(r && r.message) || "Failed load."}</p>`;
        }
    }
    function onOpenPermitsLoadFailure(e) {
        hideLoader();
        const lc = document.getElementById("open-permits-list");
        if (lc)
            lc.innerHTML = `<p class="error-message" style="display:block;">${e.message}</p>`;
    }
    async function handleClosePermit(id) {
        if (!id) return;
        showLoader("Closing...");
        try {
            const r = await callApi("closePermit", { permitId: id });
            onPermitClosed(r);
        } catch (e) {
            onPermitCloseFailure(e);
        }
    }
    function onPermitClosed(r) {
        hideLoader();
        showMessage(closePermitMsg, r ? r.message : "Closed.", true);
        loadOpenPermits();
    }
    function onPermitCloseFailure(e) {
        hideLoader();
        showMessage(closePermitMsg, e.message, false);
    }

    // --- Monitor Permits Logic ---
    function populateMonitorProjects() {
        if (
            !monitorProjectFilter ||
            !currentUser ||
            !initialData ||
            !initialData.projects
        ) {
            if (monitorProjectFilter)
                monitorProjectFilter.innerHTML =
                    '<option value="ALL_ACCESSIBLE">All</option><option disabled>Err</option>';
            return;
        }
        monitorProjectFilter.innerHTML =
            '<option value="ALL_ACCESSIBLE">All Accessible</option>';
        initialData.projects.forEach(
            (p) =>
                (monitorProjectFilter.innerHTML += `<option value="${p}">${p}</option>`),
        );
    }
    function buildResultsTable(permits) {
        if (!monitorResultsTable) return;
        if (!permits || !Array.isArray(permits) || permits.length === 0) {
            monitorResultsTable.innerHTML = "<p>No results.</p>";
            return;
        }
        let tbl = `<table class="results-table"><thead><tr><th>ID</th><th>Project</th><th>Date</th><th>Type</th><th>Issuer</th><th>Status</th></tr></thead><tbody>`;
        permits.forEach((p) => {
            tbl += `<tr><td>${p.id || "-"}</td><td>${p.projectName || "-"}</td><td>${p.permitDate || "-"}</td><td>${p.permitType || "-"}</td><td>${p.issuer || "-"}</td><td class="${p.status && p.status.toUpperCase() === "OPEN" ? "status-open" : "status-closed"}">${p.status || "-"}</td></tr>`;
        });
        tbl += `</tbody></table>`;
        monitorResultsTable.innerHTML = tbl;
    }
    async function performSearch() {
        if (!currentUser || !monitorProjectFilter /*...etc*/) return;
        const f = {
            selectedProject: monitorProjectFilter.value,
            fromDate: monitorFromDate.value || null,
            toDate: monitorToDate.value || null,
            showOpenOnly: monitorOpenOnly.checked,
        };
        if (
            f.fromDate &&
            f.toDate &&
            new Date(f.fromDate) > new Date(f.toDate)
        ) {
            showMessage(monitorMessage, "'From' before 'To'.", false);
            return;
        }
        if (monitorMessage) monitorMessage.style.display = "none";
        if (monitorResultsTable)
            monitorResultsTable.innerHTML = "<p>Searching...</p>";
        try {
            const r = await callApi("searchPermits", {
                filters: f,
                userInfo: currentUser,
            });
            onSearchSuccess(r);
        } catch (e) {
            onSearchFailure(e);
        }
    }
    function onSearchSuccess(r) {
        hideLoader();
        buildResultsTable(r.permits);
    }
    function onSearchFailure(e) {
        hideLoader();
        showMessage(monitorMessage, e.message, false);
        if (monitorResultsTable) monitorResultsTable.innerHTML = "";
    }
    if (monitorSearchBtn) {
        monitorSearchBtn.addEventListener("click", performSearch);
    } else {
        console.error("#monitor-search-btn?");
    }
}); // --- END DOMContentLoaded ---
