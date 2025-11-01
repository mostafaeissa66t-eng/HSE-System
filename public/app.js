// =================================== */
// CLIENT-SIDE LOGIC (app.js - Final Vercel/Replit Proxy Version - Correct Order)
// =================================== */

// API endpoint on the same server (points to api/index.js via Vercel or server.js via Replit)
const API_URL = "/api";

// --- === UTILITY FUNCTIONS (Defined FIRST!) === ---
function showLoader(message = "جاري التحميل...") {
    const loader = document.getElementById("loader-overlay");
    const loaderText = loader ? loader.querySelector("p") : null;
    if (loaderText) loaderText.textContent = message;
    if (loader) loader.style.display = "flex";
}
function hideLoader() {
    const loader = document.getElementById("loader-overlay");
    // Add a small delay
    setTimeout(() => {
        if (loader) loader.style.display = "none";
    }, 100);
}
function showMessage(element, text, isSuccess) {
    if (element) {
        element.textContent = text;
        element.className = isSuccess ? "success-message" : "error-message";
        element.style.display = "block";
        setTimeout(() => {
            if (element) element.style.display = "none";
        }, 5000);
    } else {
        console.warn("Attempted showMessage on null:", text);
    }
}

// --- API Call Function (Uses Utilities defined above) ---
async function callApi(action, payload) {
    let loaderMessage = `جاري ${action}...`;
    if (action === "checkLogin") loaderMessage = "جاري تسجيل الدخول...";
    if (action === "getInitialData") loaderMessage = "جاري تحميل البيانات...";
    if (action === "savePermit") loaderMessage = "جاري حفظ التصريح...";
    if (action === "saveObservation") loaderMessage = "جاري حفظ الملاحظة...";
    if (action === "getOpenPermits") loaderMessage = "جاري تحميل التصاريح...";
    if (action === "closePermit") loaderMessage = "جاري إغلاق التصريح...";
    if (action === "searchPermits") loaderMessage = "جاري البحث...";

    showLoader(loaderMessage); // Now showLoader is defined

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action, payload: payload }),
        });
        const responseText = await response.text();
        hideLoader(); // Hide loader after getting response

        if (!response.ok) {
            console.error(
                `API Error Response (${response.status}) for ${action}:`,
                responseText,
            );
            let errorMsg = `API Error: ${response.status} ${response.statusText}`;
            try {
                const ed = JSON.parse(responseText);
                if (ed.message) errorMsg = ed.message;
            } catch (e) {
                /* ignore */
            }
            throw new Error(errorMsg);
        }
        try {
            const result = JSON.parse(responseText);
            if (result && result.status === "error") {
                console.error(
                    `Google Script Error for ${action}:`,
                    result.message,
                );
                throw new Error(result.message || "خطأ من السيرفر.");
            }
            return result;
        } catch (parseError) {
            console.error(
                `JSON Parse Error for ${action}:`,
                parseError,
                "Raw:",
                responseText,
            );
            throw new Error(
                `Received invalid response: ${responseText.substring(0, 100)}...`,
            );
        }
    } catch (error) {
        hideLoader(); // Ensure hidden on error
        console.error(`callApi Error for ${action}:`, error);
        throw new Error(`فشل الاتصال بالخادم (${action}): ${error.message}`);
    }
}

// --- Run when DOM is ready ---
document.addEventListener("DOMContentLoaded", function () {
    // --- GLOBAL STATE ---
    let currentUser = null;
    let initialData = null;

    // --- SELECTORS ---
    // (Ensure these IDs match your public/index.html)
    const loader = document.getElementById("loader-overlay"); // Used by utilities, but good to have ref
    const loginScreen = document.getElementById("login-screen");
    const appWrapper = document.getElementById("app-wrapper");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const content = document.getElementById("content");
    const sidebarMenu = document.getElementById("sidebar-menu");
    const logoutBtn = document.getElementById("logout-btn");
    const permitForm = document.getElementById("permit-form");
    const obsForm = document.getElementById("observation-form");
    const permitMsg = document.getElementById("permit-message");
    const obsMsg = document.getElementById("obs-message");
    const closePermitMsg = document.getElementById("close-permit-message");
    const monitorProjectFilter = document.getElementById(
        "monitor-project-filter",
    );
    const monitorRequesterFilter = document.getElementById(
        "monitor-requester-filter",
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

    // --- Login Logic ---
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const u = document.getElementById("username");
            const p = document.getElementById("password");
            if (!u || !p) return;
            if (loginError) loginError.style.display = "none";
            // callApi shows loader
            try {
                const r = await callApi("checkLogin", {
                    username: u.value,
                    password: p.value,
                });
                onLoginSuccess(r);
            } catch (err) {
                onLoginFailure(err);
            } // callApi hides loader
        });
    } else {
        console.error("#login-form not found.");
    }

    function onLoginSuccess(response) {
        /* ... (نفس الكود من الرد السابق بدون تغيير) ... */
        currentUser = response.userInfo;
        if (loginScreen) loginScreen.style.display = "none";
        if (appWrapper) appWrapper.style.display = "flex";
        const wu = document.getElementById("welcome-user");
        const ur = document.getElementById("user-role");
        if (wu) wu.textContent = `أهلاً، ${currentUser.username || "?"}`;
        if (ur) ur.textContent = currentUser.role || "?";
        buildSidebar(currentUser.sections);
        loadInitialData();
        const firstLink = sidebarMenu ? sidebarMenu.querySelector("a") : null;
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
    }
    function onLoginFailure(error) {
        /* ... (نفس الكود من الرد السابق بدون تغيير) ... */
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
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            showLoader("تسجيل الخروج...");
            location.reload();
        });
    } else {
        console.error("#logout-btn not found.");
    }
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

    function buildSidebar(sectionsString) {
        /* ... (نفس الكود من الرد السابق بدون تغيير) ... */
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
        const cleanedString = sectionsString; // Assumes cleaned by backend
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
    function showSection(sectionId) {
        /* ... (نفس الكود من الرد السابق بدون تغيير) ... */
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
    async function loadInitialData() {
        /* ... (نفس الكود من الرد السابق، يتأكد من currentUser وينادي callApi) ... */
        if (!currentUser) {
            console.error("Cannot load initial data: User not set.");
            return;
        }
        // Use callBackend (which shows loader)
        try {
            const r = await callApi("getInitialData", {
                userInfo: currentUser,
            });
            onDataLoaded(r);
        } catch (e) {
            onDataLoadFailure(e);
        }
    }
    function onDataLoaded(response) {
        /* ... (نفس الكود من الرد السابق، يخزن initialData وينادي populateDropdowns) ... */
        // hideLoader called by callApi wrapper
        if (response && response.status === "success") {
            initialData = response; // Store globally
            populateDropdowns(initialData); // Populate forms
            // If Monitor section is visible, populate its projects too
            const monitorSection = document.getElementById("MonitorPermits");
            if (monitorSection && monitorSection.style.display !== "none") {
                populateMonitorProjects();
            }
        } else {
            alert(
                "فشل في جلب بيانات الإعداد: " +
                    ((response && response.message) || "خطأ غير معروف"),
            );
        }
    }
    function onDataLoadFailure(error) {
        /* ... (نفس الكود من الرد السابق، يعرض رسالة خطأ) ... */
        // hideLoader called by callApi wrapper
        alert("خطأ فادح في الاتصال لجلب بيانات الإعداد: " + error.message);
    }
    function populateDropdowns(data) {
        /* ... (نفس الكود من الرد السابق، مع إضافة فلتر الجهة الطالبة) ... */
        if (!data) return;
        const fill = (id, key, defaultOption = "اختر...") => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = `<option value="">${defaultOption}</option>`; // Use default option text
                if (data[key] && Array.isArray(data[key])) {
                    data[key].forEach(
                        (o) =>
                            (select.innerHTML += `<option value="${o}">${o}</option>`),
                    );
                } else {
                    console.warn(
                        `Data key '${key}' missing or not array for #${id}`,
                    );
                }
            } else {
                console.warn(`Select element #${id} not found.`);
            }
        };
        fill("permit-project", "projects");
        fill("permit-type", "permitTypes");
        fill("permit-requester", "requesters");
        fill("obs-project", "projects");
        fill("monitor-requester-filter", "requesters", "الكل"); // <-- Added for monitor filter
    }
    function resetPermitForm() {
        /* ... (نفس الكود من الرد السابق) ... */
        if (!permitForm || !currentUser) return;
        permitForm.reset();
        const iss = document.getElementById("permit-issuer");
        const ts = document.getElementById("permit-timestamp");
        const dt = document.getElementById("permit-date");
        if (iss) iss.value = currentUser.username;
        if (ts)
            ts.value = new Date().toLocaleString("ar-EG", {
                dateStyle: "short",
                timeStyle: "short",
            });
        if (dt) dt.valueAsDate = new Date();
    }
    if (permitForm) {
        permitForm.addEventListener("submit", async function (e) {
            /* ... (نفس الكود من الرد السابق، ينادي callApi) ... */
            e.preventDefault();
            if (!currentUser) return;
            // No showLoader here
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
                showMessage(permitMsg, "اكمل الحقول.", false);
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
    } else {
        console.error("#permit-form not found.");
    }
    function onPermitSaveSuccess(r) {
        showMessage(permitMsg, r ? r.message : "تم.", true);
        resetPermitForm();
    }
    function onPermitSaveFailure(e) {
        showMessage(permitMsg, e.message, false);
    }
    function resetObservationForm() {
        /* ... (نفس الكود من الرد السابق) ... */
        if (!obsForm || !currentUser) return;
        obsForm.reset();
        const iss = document.getElementById("obs-issuer");
        const dt = document.getElementById("obs-date");
        const tm = document.getElementById("obs-time");
        if (iss) iss.value = currentUser.username;
        if (dt) dt.valueAsDate = new Date();
        if (tm) tm.value = new Date().toTimeString().slice(0, 5);
    }
    if (obsForm) {
        obsForm.addEventListener("submit", async function (e) {
            /* ... (نفس الكود من الرد السابق، ينادي callApi) ... */
            e.preventDefault();
            if (!currentUser) return;
            // No showLoader here
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
                showMessage(obsMsg, "اكمل الحقول.", false);
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
    } else {
        console.error("#observation-form not found.");
    }
    function onObsSaveSuccess(r) {
        showMessage(obsMsg, r ? r.message : "تم.", true);
        resetObservationForm();
    }
    function onObsSaveFailure(e) {
        showMessage(obsMsg, e.message, false);
    }
    async function loadOpenPermits() {
        /* ... (نفس الكود من الرد السابق، ينادي callApi) ... */
        if (!currentUser) return;
        const lc = document.getElementById("open-permits-list");
        if (lc) lc.innerHTML = "<p>تحميل...</p>";
        try {
            const r = await callApi("getOpenPermits", {
                userInfo: currentUser,
            });
            onOpenPermitsLoaded(r);
        } catch (e) {
            onOpenPermitsLoadFailure(e);
        }
    }
    function onOpenPermitsLoaded(response) {
        /* ... (نفس الكود من الرد السابق، مع إضافة الوصف) ... */
        const lc = document.getElementById("open-permits-list");
        if (!lc) return;
        // No status check needed here
        if (response.permits && response.permits.length === 0) {
            lc.innerHTML = "<p>لا توجد تصاريح مفتوحة.</p>";
            return;
        }
        if (response.permits) {
            lc.innerHTML = ""; // Clear loading
            response.permits.forEach((p) => {
                const card = document.createElement("div");
                card.className = "permit-card";
                // Added description paragraph
                card.innerHTML = `<div class="permit-info"><p><strong>المشروع:</strong> ${p.project || "-"}</p><p><strong>النوع:</strong> ${p.type || "-"}</p><p><strong>التاريخ:</strong> ${p.date || "-"}</p><p><strong>الوصف:</strong> ${p.description || "-"}</p><p><strong>ID:</strong> ${p.id || "-"}</p></div><button class="btn-close" data-id="${p.id}"><i class="fas fa-check-circle"></i> إغلاق</button>`;
                const btn = card.querySelector(".btn-close");
                if (btn) {
                    btn.addEventListener("click", function () {
                        if (confirm(`إغلاق ${this.dataset.id}؟`)) {
                            handleClosePermit(this.dataset.id);
                        }
                    });
                }
                lc.appendChild(card);
            });
        } else {
            lc.innerHTML = `<p class="error-message" style="display:block;">${(response && response.message) || "فشل تحميل التصاريح."}</p>`;
        }
    }
    function onOpenPermitsLoadFailure(e) {
        /* ... (نفس الكود من الرد السابق) ... */
        const lc = document.getElementById("open-permits-list");
        if (lc)
            lc.innerHTML = `<p class="error-message" style="display:block;">${e.message}</p>`;
    }
    async function handleClosePermit(id) {
        /* ... (نفس الكود من الرد السابق، ينادي callApi) ... */
        if (!id) return;
        // No showLoader here
        try {
            const r = await callApi("closePermit", { permitId: id });
            onPermitClosed(r);
        } catch (e) {
            onPermitCloseFailure(e);
        }
    }
    function onPermitClosed(r) {
        showMessage(closePermitMsg, r ? r.message : "تم.", true);
        loadOpenPermits();
    }
    function onPermitCloseFailure(e) {
        showMessage(closePermitMsg, e.message, false);
    }
    function populateMonitorProjects() {
        /* ... (نفس الكود من الرد السابق) ... */
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
        /* ... (نفس الكود من الرد السابق، مع إضافة الأعمدة الجديدة) ... */
        if (!monitorResultsTable) return;
        if (!permits || !Array.isArray(permits) || permits.length === 0) {
            monitorResultsTable.innerHTML = "<p>No results.</p>";
            return;
        }
        let tbl = `<table class="results-table"><thead><tr><th>ID</th><th>Project</th><th>Date</th><th>Type</th><th>Issuer</th><th>Requester</th><th>Description</th><th>Status</th></tr></thead><tbody>`;
        permits.forEach((p) => {
            tbl += `<tr><td>${p.id || "-"}</td><td>${p.projectName || "-"}</td><td>${p.permitDate || "-"}</td><td>${p.permitType || "-"}</td><td>${p.issuer || "-"}</td><td>${p.requester || "-"}</td><td title="${p.description || ""}">${p.description || "-"}</td><td class="${p.status && p.status.toUpperCase() === "OPEN" ? "status-open" : "status-closed"}">${p.status || "-"}</td></tr>`;
        });
        tbl += `</tbody></table>`;
        monitorResultsTable.innerHTML = tbl;
    }
    async function performSearch() {
        /* ... (نفس الكود من الرد السابق، يقرأ الفلتر الجديد وينادي callApi) ... */
        if (
            !currentUser ||
            !monitorProjectFilter ||
            !monitorRequesterFilter ||
            !monitorFromDate ||
            !monitorToDate ||
            !monitorOpenOnly ||
            !monitorMessage ||
            !monitorResultsTable
        ) {
            alert("Search elements missing.");
            return;
        }
        const filters = {
            selectedProject: monitorProjectFilter.value,
            selectedRequester: monitorRequesterFilter.value || null,
            fromDate: monitorFromDate.value || null,
            toDate: monitorToDate.value || null,
            showOpenOnly: monitorOpenOnly.checked,
        };
        if (
            filters.fromDate &&
            filters.toDate &&
            new Date(filters.fromDate) > new Date(filters.toDate)
        ) {
            showMessage(monitorMessage, "'From' before 'To'.", false);
            return;
        }
        if (monitorMessage) monitorMessage.style.display = "none";
        if (monitorResultsTable)
            monitorResultsTable.innerHTML = "<p>Searching...</p>";
        // Use callBackend (shows loader)
        try {
            const r = await callApi("searchPermits", {
                filters: filters,
                userInfo: currentUser,
            });
            onSearchSuccess(r);
        } catch (e) {
            onSearchFailure(e);
        }
    }
    function onSearchSuccess(response) {
        buildResultsTable(response.permits);
    }
    function onSearchFailure(error) {
        showMessage(monitorMessage, error.message, false);
        if (monitorResultsTable) monitorResultsTable.innerHTML = "";
    }
    if (monitorSearchBtn) {
        monitorSearchBtn.addEventListener("click", performSearch);
    } else {
        console.error("#monitor-search-btn not found.");
    }
}); // --- END DOMContentLoaded ---
