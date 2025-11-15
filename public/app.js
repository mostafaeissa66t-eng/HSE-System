// =================================== */
// CLIENT-SIDE LOGIC (app.js - Final V5 - KPI Module Upgraded)
// =================================== */

// API endpoint on the same server (points to api/index.js or server.js via proxy)
const API_URL = "/api";

// --- Run when DOM is ready ---
document.addEventListener("DOMContentLoaded", function () {
            // --- GLOBAL STATE ---
            let currentUser = null; // Stores {username, email, role, projects, sections}
            let initialData = null; // Stores {projects:[], permitTypes:[], requesters:[]}

            // --- SELECTORS ---
            // (Ensure these IDs match your public/index.html)
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
            const closePermitMsg = document.getElementById(
                        "close-permit-message",
            );

            // Monitor Section Selectors
            const monitorProjectFilter = document.getElementById(
                        "monitor-project-filter",
            );
            const monitorRequesterFilter = document.getElementById(
                        "monitor-requester-filter",
            );
            const monitorFromDate =
                        document.getElementById("monitor-from-date");
            const monitorToDate = document.getElementById("monitor-to-date");
            const monitorOpenOnly =
                        document.getElementById("monitor-open-only");
            const monitorSearchBtn =
                        document.getElementById("monitor-search-btn");
            const monitorResultsTable = document.getElementById(
                        "monitor-results-table",
            );
            const monitorMessage = document.getElementById("monitor-message");

            // KPI Evaluation Selectors
            const kpiEmployeeSelect = document.getElementById(
                        "kpi-employee-select",
            );
            const kpiPeriodSelect =
                        document.getElementById("kpi-period-select");
            const kpiEmployeeJobTitle = document.getElementById(
                        "kpi-employee-jobtitle",
            );
            const kpiMessageArea = document.getElementById("kpi-message-area");
            const kpiFormArea = document.getElementById("kpi-form-area");
            const kpiListContainer =
                        document.getElementById("kpi-list-container");
            const kpiSaveBtn = document.getElementById("kpi-save-btn");
            const kpiSaveMessage = document.getElementById("kpi-save-message");

            // --- Mappings for Sections ---
            const sectionIcons = {
                        Dashboard: "fas fa-tachometer-alt",
                        NewPermit: "fas fa-file-signature",
                        ClosePermit: "fas fa-clipboard-check", // Corrected icon
                        NewObservation: "fas fa-eye",
                        MonitorPermits: "fas fa-tasks", // Monitor section icon
                        KpiEvaluation: "fas fa-chart-line", // KPI section icon
                        NewNearMiss: "fas fa-exclamation-triangle", // Example
            };
            const sectionNames = {
                        Dashboard: "لوحة التحكم",
                        NewPermit: "تصريح جديد",
                        ClosePermit: "إغلاق التصاريح",
                        NewObservation: "ملاحظة جديدة",
                        MonitorPermits: "متابعة التصاريح", // Monitor section name
                        KpiEvaluation: "تقييم الموظفين", // KPI section name
                        NewNearMiss: "Near Miss", // Example
            };

            // --- === UTILITY FUNCTIONS (Defined FIRST!) === ---
            function showLoader(message = "جاري التحميل...") {
                        // Ensure loader element is available (it was defined in SELECTORS)
                        const loaderText = loader
                                    ? loader.querySelector("p")
                                    : null;
                        if (loaderText) loaderText.textContent = message;
                        if (loader) loader.style.display = "flex";
            }
            function hideLoader() {
                        // Add a small delay to prevent flickering
                        setTimeout(() => {
                                    if (loader) loader.style.display = "none";
                        }, 100);
            }

            // (*** معدل ***)
            function showMessage(element, text, isSuccess) {
                        if (element) {
                                    element.textContent = text;
                                    element.className = isSuccess
                                                ? "success-message"
                                                : "error-message";
                                    element.style.display = "block";

                                    // جعل رسالة النسبة المئوية تظهر لوقت أطول
                                    let timeout =
                                                element.id ===
                                                            "kpi-save-message" &&
                                                isSuccess
                                                            ? 10000
                                                            : 5000; // 10 ثوان لرسالة النسبة

                                    setTimeout(() => {
                                                if (element)
                                                            element.style.display =
                                                                        "none";
                                    }, timeout); // Hide after 5s or 10s
                        } else {
                                    // Fallback if element is not found (e.g., kpiSaveMessage)
                                    console.warn(
                                                "Attempted to show message on a non-existent element:",
                                                text,
                                    );
                        }
            }

            // (*** معدل ***)
            // --- API Call Function (Defined AFTER utilities) ---
            async function callApi(action, payload) {
                        let loaderMessage = `جاري ${action}...`;
                        if (action === "checkLogin")
                                    loaderMessage = "جاري تسجيل الدخول...";
                        if (action === "getInitialData")
                                    loaderMessage = "جاري تحميل البيانات...";
                        if (action === "savePermit")
                                    loaderMessage = "جاري حفظ التصريح...";
                        if (action === "saveObservation")
                                    loaderMessage = "جاري حفظ الملاحظة...";
                        if (action === "getOpenPermits")
                                    loaderMessage = "جاري تحميل التصاريح...";
                        if (action === "closePermit")
                                    loaderMessage = "جاري إغلاق التصريح...";
                        if (action === "searchPermits")
                                    loaderMessage = "جاري البحث...";

                        // رسائل اللودر الجديدة للـ KPI
                        if (action === "getEmployeesToEvaluate")
                                    loaderMessage = "جاري تحميل الموظفين...";
                        if (action === "getKPIsForEmployee")
                                    loaderMessage =
                                                "جاري تحميل بنود التقييم..."; // تعديل الرسالة
                        if (action === "saveEvaluations")
                                    loaderMessage = "جاري حفظ التقييم...";

                        showLoader(loaderMessage); // This will work now

                        try {
                                    const response = await fetch(API_URL, {
                                                method: "POST",
                                                headers: {
                                                            "Content-Type": "application/json",
                                                },
                                                body: JSON.stringify({
                                                            action: action,
                                                            payload: payload,
                                                }),
                                    });
                                    const responseText = await response.text();
                                    hideLoader(); // Hide loader after getting response

                                    if (!response.ok) {
                                                console.error(
                                                            `API Error Response (${response.status}) for action ${action}:`,
                                                            responseText,
                                                );
                                                let errorMsg = `API Error: ${response.status} ${response.statusText}`;
                                                try {
                                                            const ed =
                                                                        JSON.parse(
                                                                                    responseText,
                                                                        );
                                                            if (ed.message)
                                                                        errorMsg =
                                                                                    ed.message;
                                                } catch (e) {
                                                            /* ignore */
                                                }
                                                throw new Error(errorMsg);
                                    }
                                    try {
                                                const result =
                                                            JSON.parse(
                                                                        responseText,
                                                            );
                                                // السماح لـ info status بالمرور (مفيد لرسالة "لم يتم إدخال درجات")
                                                if (
                                                            result &&
                                                            result.status ===
                                                                        "error"
                                                ) {
                                                            console.error(
                                                                        `Google Script Error for action ${action}:`,
                                                                        result.message,
                                                            );
                                                            throw new Error(
                                                                        result.message ||
                                                                                    "خطأ من السيرفر.",
                                                            );
                                                }
                                                return result;
                                    } catch (parseError) {
                                                console.error(
                                                            `JSON Parse Error for action ${action}:`,
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
                                    console.error(
                                                `callApi Error for action ${action}:`,
                                                error,
                                    );
                                    throw new Error(
                                                `فشل الاتصال بالخادم (${action}): ${error.message}`,
                                    );
                        }
            }

            // --- =================================== ---
            // --- START APPLICATION LOGIC (Defined AFTER helpers)
            // --- =================================== ---

            // --- Login Logic ---
            if (loginForm) {
                        loginForm.addEventListener(
                                    "submit",
                                    async function (e) {
                                                e.preventDefault();
                                                const u =
                                                            document.getElementById(
                                                                        "username",
                                                            );
                                                const p =
                                                            document.getElementById(
                                                                        "password",
                                                            );
                                                if (!u || !p) return;
                                                if (loginError)
                                                            loginError.style.display =
                                                                        "none";
                                                // callApi shows loader
                                                try {
                                                            const r =
                                                                        await callApi(
                                                                                    "checkLogin",
                                                                                    {
                                                                                                username: u.value,
                                                                                                password: p.value,
                                                                                    },
                                                                        );
                                                            onLoginSuccess(r);
                                                } catch (err) {
                                                            onLoginFailure(err);
                                                } // callApi hides loader
                                    },
                        );
            } else {
                        console.error("#login-form not found.");
            }

            function onLoginSuccess(response) {
                        currentUser = response.userInfo;
                        if (loginScreen) loginScreen.style.display = "none";
                        if (appWrapper) appWrapper.style.display = "flex";
                        const wu = document.getElementById("welcome-user");
                        const ur = document.getElementById("user-role");
                        if (wu)
                                    wu.textContent = `أهلاً، ${currentUser.username || "?"}`;
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
                                    !currentUser.sections
                                                .toUpperCase()
                                                .includes("DASHBOARD")
                        ) {
                                    const secs = String(currentUser.sections)
                                                .split(",")
                                                .map((s) => s.trim())
                                                .filter((s) => s);
                                    if (
                                                secs.length > 0 &&
                                                sectionNames[secs[0]]
                                    )
                                                initialSection = secs[0];
                        }
                        showSection(initialSection);
            }
            function onLoginFailure(error) {
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
                                                sidebar.classList.contains(
                                                            "active",
                                                ) &&
                                                sidebarToggle &&
                                                !sidebarToggle.contains(
                                                            e.target,
                                                )
                                    ) {
                                                sidebar.classList.remove(
                                                            "active",
                                                );
                                    }
                        });
            }

            function buildSidebar(sectionsString) {
                        if (!sidebarMenu) {
                                    console.error("#sidebar-menu not found.");
                                    return;
                        }
                        sidebarMenu.innerHTML = "";
                        if (!sectionsString) {
                                    sidebarMenu.innerHTML =
                                                "<li><a>لا أقسام</a></li>";
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
                                    sidebarMenu.innerHTML =
                                                "<li><a>لا أقسام متاحة</a></li>";
                                    return;
                        }
                        let isFirstLink = true;
                        sections.forEach((sectionId) => {
                                    if (sectionNames[sectionId]) {
                                                const li =
                                                            document.createElement(
                                                                        "li",
                                                            );
                                                const a =
                                                            document.createElement(
                                                                        "a",
                                                            );
                                                a.href = "#";
                                                a.dataset.section = sectionId;
                                                const icon =
                                                            document.createElement(
                                                                        "i",
                                                            );
                                                icon.className =
                                                            sectionIcons[
                                                                        sectionId
                                                            ] ||
                                                            "fas fa-question-circle";
                                                a.appendChild(icon);
                                                a.appendChild(
                                                            document.createTextNode(
                                                                        " " +
                                                                                    sectionNames[
                                                                                                sectionId
                                                                                    ],
                                                            ),
                                                );
                                                if (isFirstLink) {
                                                            a.classList.add(
                                                                        "active",
                                                            );
                                                            isFirstLink = false;
                                                }
                                                a.addEventListener(
                                                            "click",
                                                            function (e) {
                                                                        e.preventDefault();
                                                                        const targetId =
                                                                                    this
                                                                                                .dataset
                                                                                                .section;
                                                                        showSection(
                                                                                    targetId,
                                                                        );
                                                                        sidebarMenu.querySelectorAll(
                                                                                    "a",
                                                                        ).forEach(
                                                                                    (
                                                                                                link,
                                                                                    ) =>
                                                                                                link.classList.remove(
                                                                                                            "active",
                                                                                                ),
                                                                        );
                                                                        this.classList.add(
                                                                                    "active",
                                                                        );
                                                                        if (
                                                                                    window.innerWidth <=
                                                                                                768 &&
                                                                                    sidebar
                                                                        ) {
                                                                                    sidebar.classList.remove(
                                                                                                "active",
                                                                                    );
                                                                        }
                                                            },
                                                );
                                                li.appendChild(a);
                                                sidebarMenu.appendChild(li);
                                    } else {
                                                console.warn(
                                                            `Section ID "${sectionId}" ignored.`,
                                                );
                                    }
                        });
            }

            // (*** معدل ***)
            function showSection(sectionId) {
                        if (!sectionId) {
                                    console.error("showSection: no id.");
                                    return;
                        }
                        document.querySelectorAll(".page-section").forEach(
                                    (section) => {
                                                if (section)
                                                            section.style.display =
                                                                        "none";
                                    },
                        );
                        const target = document.getElementById(sectionId);
                        if (target) {
                                    target.style.display = "block";
                                    if (sectionId === "NewPermit")
                                                resetPermitForm();
                                    if (sectionId === "NewObservation")
                                                resetObservationForm();
                                    if (sectionId === "ClosePermit")
                                                loadOpenPermits();
                                    if (sectionId === "MonitorPermits") {
                                                populateMonitorProjects();
                                                if (monitorResultsTable)
                                                            monitorResultsTable.innerHTML =
                                                                        "<p>حدد معايير البحث...</p>";
                                                if (monitorMessage)
                                                            monitorMessage.style.display =
                                                                        "none";
                                    }
                                    // (*** هذا هو التعديل الوحيد في هذه الدالة ***)
                                    if (sectionId === "KpiEvaluation") {
                                                initKpiPage(); // <-- استدعاء الدالة الجديدة
                                    }
                        } else {
                                    console.error(
                                                `Section "#${sectionId}" not found.`,
                                    );
                                    const db =
                                                document.getElementById(
                                                            "Dashboard",
                                                );
                                    if (db) db.style.display = "block"; // Fallback
                                    const dbl = sidebarMenu
                                                ? sidebarMenu.querySelector(
                                                              'a[data-section="Dashboard"]',
                                                  )
                                                : null;
                                    if (dbl) {
                                                sidebarMenu.querySelectorAll(
                                                            "a",
                                                ).forEach((a) =>
                                                            a.classList.remove(
                                                                        "active",
                                                            ),
                                                );
                                                dbl.classList.add("active");
                                    }
                        }
            }
            async function loadInitialData() {
                        if (!currentUser) {
                                    console.error(
                                                "Cannot load initial data: User not set.",
                                    );
                                    return;
                        }
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
                        if (response && response.status === "success") {
                                    initialData = response;
                                    populateDropdowns(initialData);
                                    const ms =
                                                document.getElementById(
                                                            "MonitorPermits",
                                                );
                                    if (ms && ms.style.display !== "none")
                                                populateMonitorProjects();
                        } else {
                                    alert(
                                                "Failed config: " +
                                                            (response
                                                                        ? response.message
                                                                        : "?"),
                                    );
                        }
            }
            function onDataLoadFailure(error) {
                        alert("Failed config connect: " + error.message);
            }
            function populateDropdowns(data) {
                        if (!data) return;
                        const fill = (id, key, defaultOption = "اختر...") => {
                                    const select = document.getElementById(id);
                                    if (select) {
                                                select.innerHTML = `<option value="">${defaultOption}</option>`;
                                                if (
                                                            data[key] &&
                                                            Array.isArray(
                                                                        data[
                                                                                    key
                                                                        ],
                                                            )
                                                ) {
                                                            data[key].forEach(
                                                                        (o) =>
                                                                                    (select.innerHTML += `<option value="${o}">${o}</option>`),
                                                            );
                                                } else {
                                                            console.warn(
                                                                        `Data key '${key}' missing/not array for #${id}`,
                                                            );
                                                }
                                    } else {
                                                console.warn(
                                                            `Select element #${id} not found.`,
                                                );
                                    }
                        };
                        fill("permit-project", "projects");
                        fill("permit-type", "permitTypes");
                        fill("permit-requester", "requesters");
                        fill("obs-project", "projects");
                        fill("monitor-requester-filter", "requesters", "الكل");
            }
            function resetPermitForm() {
                        if (!permitForm || !currentUser) return;
                        permitForm.reset();
                        const i = document.getElementById("permit-issuer");
                        const ts = document.getElementById("permit-timestamp");
                        const dt = document.getElementById("permit-date");
                        if (i) i.value = currentUser.username;
                        if (ts)
                                    ts.value = new Date().toLocaleString(
                                                "ar-EG",
                                                {
                                                            dateStyle: "short",
                                                            timeStyle: "short",
                                                },
                                    );
                        if (dt) dt.valueAsDate = new Date();
                        // (جديد) إخفاء حقل المقاول عند الريسيت
                        const subcontractorGroup = document.getElementById(
                                    "permit-subcontractor-group",
                        );
                        if (subcontractorGroup)
                                    subcontractorGroup.style.display = "none";
            }
            if (permitForm) {
                        permitForm.addEventListener(
                                    "submit",
                                    async function (e) {
                                                e.preventDefault();
                                                if (!currentUser) return;
                                                const d = {
                                                            projectName: document.getElementById(
                                                                        "permit-project",
                                                            )?.value,
                                                            permitDate: document.getElementById(
                                                                        "permit-date",
                                                            )?.value,
                                                            shift: document.getElementById(
                                                                        "permit-shift",
                                                            )?.value,
                                                            permitType: document.getElementById(
                                                                        "permit-type",
                                                            )?.value,
                                                            requester: document.getElementById(
                                                                        "permit-requester",
                                                            )?.value,
                                                            siteEngineer: document.getElementById(
                                                                        "permit-engineer",
                                                            )?.value,
                                                            subcontractor: document.getElementById(
                                                                        "permit-subcontractor",
                                                            )?.value,
                                                            location: document.getElementById(
                                                                        "permit-location",
                                                            )?.value,
                                                            startTime: document.getElementById(
                                                                        "permit-starttime",
                                                            )?.value,
                                                            workersCount: document.getElementById(
                                                                        "permit-workers",
                                                            )?.value,
                                                            description: document.getElementById(
                                                                        "permit-description",
                                                            )?.value,
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
                                                            showMessage(
                                                                        permitMsg,
                                                                        "اكمل الحقول.",
                                                                        false,
                                                            );
                                                            return;
                                                }
                                                try {
                                                            const r =
                                                                        await callApi(
                                                                                    "savePermit",
                                                                                    {
                                                                                                permitObject: d,
                                                                                                userInfo: currentUser,
                                                                                    },
                                                                        );
                                                            onPermitSaveSuccess(
                                                                        r,
                                                            );
                                                } catch (err) {
                                                            onPermitSaveFailure(
                                                                        err,
                                                            );
                                                }
                                    },
                        );
            }
            function onPermitSaveSuccess(r) {
                        showMessage(permitMsg, r ? r.message : "تم.", true);
                        resetPermitForm();
                        // (جديد) إخفاء حقل المقاول بعد الحفظ
                        const subcontractorGroup = document.getElementById(
                                    "permit-subcontractor-group",
                        );
                        if (subcontractorGroup)
                                    subcontractorGroup.style.display = "none";
            }
            function onPermitSaveFailure(e) {
                        showMessage(permitMsg, e.message, false);
            }
            // =================================== */
            // --- (جديد) منطق إظهار المقاولين الديناميكي ---
            // =================================== */

            // 1. جلب العناصر من الـ HTML
            const permitProjectSelect =
                        document.getElementById("permit-project");
            const permitRequesterSelect =
                        document.getElementById("permit-requester");
            const subcontractorGroup = document.getElementById(
                        "permit-subcontractor-group",
            );
            const subcontractorSelect = document.getElementById(
                        "permit-subcontractor",
            );

            /**
             * دالة للتحقق من إظهار أو إخفاء حقل المقاول
             */
            async function checkContractorVisibility() {
                        if (
                                    !permitProjectSelect ||
                                    !permitRequesterSelect ||
                                    !subcontractorGroup
                        )
                                    return;

                        const selectedProject = permitProjectSelect.value;
                        const selectedRequester = permitRequesterSelect.value;

                        // (مهم جداً) عدّل كلمة "المقاول" هنا لتطابق الكلمة بالظبط
                        // اللي موجودة عندك في شيت ConfigData في عمود RequestersList
                        const contractorRequesterName = "المقاول";

                        if (
                                    selectedProject &&
                                    selectedRequester ===
                                                contractorRequesterName
                        ) {
                                    // الحالة: اختار "المقاول" ومختار "مشروع"
                                    subcontractorGroup.style.display = "block"; // أظهر الحقل
                                    subcontractorSelect.innerHTML =
                                                '<option value="">جاري التحميل...</option>';
                                    subcontractorSelect.disabled = true;

                                    try {
                                                // استدعاء الدالة الجديدة من Code.gs
                                                const response = await callApi(
                                                            "getContractorsForProject",
                                                            {
                                                                        projectName: selectedProject,
                                                                        // لا داعي لإرسال userInfo هنا لأن الدالة لا تحتاجه
                                                            },
                                                );

                                                if (
                                                            response.contractors &&
                                                            response.contractors
                                                                        .length >
                                                                        0
                                                ) {
                                                            subcontractorSelect.innerHTML =
                                                                        '<option value="">-- اختر المقاول --</option>';
                                                            response.contractors.forEach(
                                                                        (
                                                                                    name,
                                                                        ) => {
                                                                                    subcontractorSelect.options.add(
                                                                                                new Option(
                                                                                                            name,
                                                                                                            name,
                                                                                                ),
                                                                                    );
                                                                        },
                                                            );
                                                            subcontractorSelect.disabled = false;
                                                            subcontractorSelect.required = true; // (مهم) اجعل الحقل مطلوباً
                                                } else {
                                                            subcontractorSelect.innerHTML =
                                                                        '<option value="">لا يوجد مقاولين لهذا المشروع</option>';
                                                            subcontractorSelect.disabled = true;
                                                            subcontractorSelect.required = false;
                                                }
                                    } catch (error) {
                                                subcontractorSelect.innerHTML = `<option value="">خطأ: ${error.message}</option>`;
                                                subcontractorSelect.disabled = true;
                                    }
                        } else {
                                    // الحالة: لم يختر "المقاول"
                                    subcontractorGroup.style.display = "none"; // أخفِ الحقل
                                    subcontractorSelect.innerHTML = ""; // فضّي القائمة
                                    subcontractorSelect.required = false; // (مهم) اجعل الحقل غير مطلوب
                        }
            }

            // 2. ربط المستمعين (Listeners)
            if (permitProjectSelect && permitRequesterSelect) {
                        permitProjectSelect.addEventListener(
                                    "change",
                                    checkContractorVisibility,
                        );
                        permitRequesterSelect.addEventListener(
                                    "change",
                                    checkContractorVisibility,
                        );
            }
            function resetObservationForm() {
                        if (!obsForm || !currentUser) return;
                        obsForm.reset();
                        const i = document.getElementById("obs-issuer");
                        const dt = document.getElementById("obs-date");
                        const tm = document.getElementById("obs-time");
                        if (i) i.value = currentUser.username;
                        if (dt) dt.valueAsDate = new Date();
                        if (tm)
                                    tm.value = new Date()
                                                .toTimeString()
                                                .slice(0, 5);
            }
            if (obsForm) {
                        obsForm.addEventListener("submit", async function (e) {
                                    e.preventDefault();
                                    if (!currentUser) return;
                                    const d = {
                                                projectName: document.getElementById(
                                                            "obs-project",
                                                )?.value,
                                                date: document.getElementById(
                                                            "obs-date",
                                                )?.value,
                                                time: document.getElementById(
                                                            "obs-time",
                                                )?.value,
                                                location: document.getElementById(
                                                            "obs-location",
                                                )?.value,
                                                observationType:
                                                            document.getElementById(
                                                                        "obs-type",
                                                            )?.value,
                                                description: document.getElementById(
                                                            "obs-description",
                                                )?.value,
                                                correctiveAction:
                                                            document.getElementById(
                                                                        "obs-action",
                                                            )?.value,
                                    };
                                    if (
                                                !d.projectName ||
                                                !d.date ||
                                                !d.time ||
                                                !d.location ||
                                                !d.observationType ||
                                                !d.description
                                    ) {
                                                showMessage(
                                                            obsMsg,
                                                            "اكمل الحقول.",
                                                            false,
                                                );
                                                return;
                                    }
                                    try {
                                                const r = await callApi(
                                                            "saveObservation",
                                                            {
                                                                        observationObject:
                                                                                    d,
                                                                        userInfo: currentUser,
                                                            },
                                                );
                                                onObsSaveSuccess(r);
                                    } catch (err) {
                                                onObsSaveFailure(err);
                                    }
                        });
            }
            function onObsSaveSuccess(r) {
                        showMessage(obsMsg, r ? r.message : "تم.", true);
                        resetObservationForm();
            }
            function onObsSaveFailure(e) {
                        showMessage(obsMsg, e.message, false);
            }
            async function loadOpenPermits() {
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
                        const lc = document.getElementById("open-permits-list");
                        if (!lc) return;
                        if (response.permits && response.permits.length === 0) {
                                    lc.innerHTML =
                                                "<p>لا توجد تصاريح مفتوحة.</p>";
                                    return;
                        }
                        if (response.permits) {
                                    lc.innerHTML = "";
                                    response.permits.forEach((p) => {
                                                const card =
                                                            document.createElement(
                                                                        "div",
                                                            );
                                                card.className = "permit-card";
                                                card.innerHTML = `<div class="permit-info"><p><strong>المشروع:</strong> ${p.project || "-"}</p><p><strong>النوع:</strong> ${p.type || "-"}</p><p><strong>التاريخ:</strong> ${p.date || "-"}</p><p><strong>الوصف:</strong> ${p.description || "-"}</p><p><strong>ID:</strong> ${p.id || "-"}</p></div><button class="btn-close" data-id="${p.id}"><i class="fas fa-check-circle"></i> إغلاق</button>`;
                                                const btn =
                                                            card.querySelector(
                                                                        ".btn-close",
                                                            );
                                                if (btn) {
                                                            btn.addEventListener(
                                                                        "click",
                                                                        function () {
                                                                                    if (
                                                                                                confirm(
                                                                                                            `إغلاق ${this.dataset.id}؟`,
                                                                                                )
                                                                                    ) {
                                                                                                handleClosePermit(
                                                                                                            this
                                                                                                                        .dataset
                                                                                                                        .id,
                                                                                                );
                                                                                    }
                                                                        },
                                                            );
                                                }
                                                lc.appendChild(card);
                                    });
                        } else {
                                    lc.innerHTML = `<p class="error-message" style="display:block;">${(response && response.message) || "فشل تحميل."}</p>`;
                        }
            }
            function onOpenPermitsLoadFailure(e) {
                        const lc = document.getElementById("open-permits-list");
                        if (lc)
                                    lc.innerHTML = `<p class="error-message" style="display:block;">${e.message}</p>`;
            }
            async function handleClosePermit(id) {
                        if (!id) return;
                        try {
                                    const r = await callApi("closePermit", {
                                                permitId: id,
                                    });
                                    onPermitClosed(r);
                        } catch (e) {
                                    onPermitCloseFailure(e);
                        }
            }
            function onPermitClosed(r) {
                        showMessage(
                                    closePermitMsg,
                                    r ? r.message : "تم.",
                                    true,
                        );
                        loadOpenPermits();
            }
            function onPermitCloseFailure(e) {
                        showMessage(closePermitMsg, e.message, false);
            }
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
                        if (
                                    !permits ||
                                    !Array.isArray(permits) ||
                                    permits.length === 0
                        ) {
                                    monitorResultsTable.innerHTML =
                                                "<p>No results.</p>";
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
                        if (!currentUser || !monitorProjectFilter /*...etc*/)
                                    return;
                        const f = {
                                    selectedProject: monitorProjectFilter.value,
                                    selectedRequester:
                                                monitorRequesterFilter.value ||
                                                null,
                                    fromDate: monitorFromDate.value || null,
                                    toDate: monitorToDate.value || null,
                                    showOpenOnly: monitorOpenOnly.checked,
                        };
                        if (
                                    f.fromDate &&
                                    f.toDate &&
                                    new Date(f.fromDate) > new Date(f.toDate)
                        ) {
                                    showMessage(
                                                monitorMessage,
                                                "'From' before 'To'.",
                                                false,
                                    );
                                    return;
                        }
                        if (monitorMessage)
                                    monitorMessage.style.display = "none";
                        if (monitorResultsTable)
                                    monitorResultsTable.innerHTML =
                                                "<p>Searching...</p>";
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
            function onSearchSuccess(response) {
                        buildResultsTable(response.permits);
            }
            function onSearchFailure(error) {
                        showMessage(monitorMessage, error.message, false);
                        if (monitorResultsTable)
                                    monitorResultsTable.innerHTML = "";
            }
            if (monitorSearchBtn) {
                        monitorSearchBtn.addEventListener(
                                    "click",
                                    performSearch,
                        );
            } else {
                        console.error("#monitor-search-btn not found.");
            }

            // --- =================================== ---
            // --- (*** هذا هو القسم الذي تم استبداله بالكامل ***) ---
            // --- KPI EVALUATION LOGIC (New V2.1 Module - Corrected) ---
            // --- =================================== ---

            /**
             * (جديد) دالة لبدء تشغيل صفحة الـ KPI (يتم استدعاؤها عند عرض الصفحة)
             */
            function initKpiPage() {
                        console.log("بدء تشغيل صفحة تقييم الموظفين (V2.1)...");

                        // تعبئة التاريخ الافتراضي (الشهر الحالي)
                        // (kpiPeriodSelect هو type="month" وقيمته YYYY-MM)
                        if (!kpiPeriodSelect.value) {
                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = (now.getMonth() + 1)
                                                .toString()
                                                .padStart(2, "0"); // "01", "02", ... "11"
                                    kpiPeriodSelect.value = `${year}-${month}`;
                        }

                        // تحميل الموظفين التابعين للمدير
                        loadKpiEmployees();

                        // (جديد) ربط الأحداث - يتم ربطها مرة واحدة فقط
                        // إزالة أي مستمعين قدامى لضمان عدم التكرار
                        kpiEmployeeSelect.removeEventListener(
                                    "change",
                                    handleKpiSelectionChange,
                        );
                        kpiPeriodSelect.removeEventListener(
                                    "change",
                                    handleKpiSelectionChange,
                        );
                        kpiFormArea.removeEventListener(
                                    "submit",
                                    handleKpiSave,
                        );

                        // إضافة المستمعين الجدد
                        kpiEmployeeSelect.addEventListener(
                                    "change",
                                    handleKpiSelectionChange,
                        );
                        kpiPeriodSelect.addEventListener(
                                    "change",
                                    handleKpiSelectionChange,
                        );
                        kpiFormArea.addEventListener("submit", handleKpiSave);
            }

            /**
             * (جديد) جلب قائمة الموظفين التابعين للمدير
             */
            async function loadKpiEmployees() {
                        if (!currentUser) return;

                        // الاحتفاظ بالقائمة إذا كانت موجودة مسبقاً
                        if (kpiEmployeeSelect.options.length > 1) {
                                    console.log("Employees already loaded.");
                                    // التأكد من تفعيل القائمة
                                    kpiEmployeeSelect.disabled = false;
                                    return;
                        }

                        kpiEmployeeSelect.innerHTML =
                                    '<option value="">جاري تحميل...</option>';
                        kpiEmployeeSelect.disabled = true;

                        try {
                                    const response = await callApi(
                                                "getEmployeesToEvaluate",
                                                { userInfo: currentUser },
                                    );

                                    if (
                                                response.status === "success" &&
                                                response.employees
                                    ) {
                                                kpiEmployeeSelect.innerHTML =
                                                            '<option value="">-- اختر موظفاً --</option>';
                                                if (
                                                            response.employees
                                                                        .length ===
                                                            0
                                                ) {
                                                            kpiEmployeeSelect.innerHTML =
                                                                        '<option value="">لا يوجد موظفين</option>';
                                                            showMessage(
                                                                        kpiMessageArea,
                                                                        "لا يوجد موظفين مسجلين تحت إدارتك.",
                                                                        false,
                                                            );
                                                } else {
                                                            response.employees.forEach(
                                                                        (
                                                                                    emp,
                                                                        ) => {
                                                                                    // (مهم) تخزين المسمى الوظيفي في data-jobtitle
                                                                                    const option =
                                                                                                new Option(
                                                                                                            `${emp.name} (${emp.id})`,
                                                                                                            emp.id,
                                                                                                );
                                                                                    option.dataset.jobtitle =
                                                                                                emp.jobTitle;
                                                                                    kpiEmployeeSelect.options.add(
                                                                                                option,
                                                                                    );
                                                                        },
                                                            );
                                                }
                                                kpiEmployeeSelect.disabled = false;
                                    } else {
                                                throw new Error(
                                                            response.message ||
                                                                        "Failed to load employees.",
                                                );
                                    }
                        } catch (error) {
                                    showMessage(
                                                kpiMessageArea,
                                                error.message,
                                                false,
                                    );
                                    kpiEmployeeSelect.innerHTML =
                                                '<option value="">خطأ في التحميل</option>';
                        }
            }

            /**
             * (جديد) عند تغيير الموظف أو التاريخ (يتم جلب البنود)
             */
            function handleKpiSelectionChange() {
                        const employeeId = kpiEmployeeSelect.value;
                        const periodValue = kpiPeriodSelect.value; // "YYYY-MM"

                        // مسح كل شيء لو الاختيار غير مكتمل
                        kpiEmployeeJobTitle.textContent = "";
                        kpiListContainer.innerHTML =
                                    "<p>الرجاء اختيار الموظف وفترة التقييم...</p>";
                        kpiSaveBtn.style.display = "none";
                        showMessage(kpiMessageArea, "", true); // إخفاء رسالة الخطأ
                        showMessage(kpiSaveMessage, "", true); // إخفاء رسالة النجاح

                        if (employeeId && periodValue) {
                                    // (مهم) تحويل "YYYY-MM" إلى "YYYY-MM-01" كما يتوقع السيرفر
                                    const period = `${periodValue}-01`;

                                    const selectedOption =
                                                kpiEmployeeSelect.options[
                                                            kpiEmployeeSelect
                                                                        .selectedIndex
                                                ];
                                    const jobTitle =
                                                selectedOption.dataset.jobtitle;
                                    kpiEmployeeJobTitle.textContent = `المسمى الوظيفي: ${jobTitle}`;
                                    kpiEmployeeJobTitle.style.display = "block";

                                    // جلب البنود والتقييم القديم
                                    loadKpisForEmployee(employeeId, period);
                        }
            }

            /**
             * (جديد - تنفيذ الطلب الثاني والثالث)
             * جلب البنود المفلترة والتقييم القديم
             */
            async function loadKpisForEmployee(employeeId, period) {
                        kpiListContainer.innerHTML =
                                    "<p>جاري تحميل بنود التقييم...</p>";
                        kpiSaveBtn.style.display = "none";
                        showMessage(kpiMessageArea, "", true); // إخفاء رسالة الخطأ

                        try {
                                    const payload = {
                                                employeeId: employeeId,
                                                period: period,
                                                userInfo: currentUser,
                                    };

                                    // استدعاء الدالة الجديدة في Code.gs
                                    const response = await callApi(
                                                "getKPIsForEmployee",
                                                payload,
                                    );

                                    if (
                                                response.status === "success" &&
                                                response.kpis
                                    ) {
                                                if (response.kpis.length > 0) {
                                                            buildKpiForm(
                                                                        response.kpis,
                                                            ); // بناء الفورم بالبيانات
                                                            kpiSaveBtn.style.display =
                                                                        "block";
                                                } else {
                                                            kpiListContainer.innerHTML =
                                                                        "<p>لا توجد بنود تقييم مطلوبة لهذا الموظف في هذه الفترة.</p>";
                                                            kpiSaveBtn.style.display =
                                                                        "none";
                                                }
                                    } else {
                                                throw new Error(
                                                            response.message ||
                                                                        "Failed to load KPIs.",
                                                );
                                    }
                        } catch (error) {
                                    showMessage(
                                                kpiMessageArea,
                                                error.message,
                                                false,
                                    );
                                    kpiListContainer.innerHTML =
                                                '<p style="color:red;">خطأ في تحميل الـ KPIs.</p>';
                        }
            }

            /**
             * (جديد - تنفيذ الطلب الثالث: جلب القديم)
             * "رسم" نموذج التقييم وتعبئة الدرجات القديمة
             */
            function buildKpiForm(kpis) {
                        if (!kpiListContainer) return;
                        kpiListContainer.innerHTML = "";
                        let totalMaxScore = 0;

                        kpis.forEach((kpi, index) => {
                                    totalMaxScore +=
                                                parseFloat(kpi.maxScore) || 0;

                                    const card = document.createElement("div");
                                    // (ملاحظة) استخدمت كلاس "kpi-card" ليتوافق مع تنسيقك القديم
                                    card.className = "kpi-card";
                                    card.dataset.kpiId = kpi.kpiId; // تخزين الـ ID
                                    card.dataset.maxScore = kpi.maxScore; // تخزين الدرجة القصوى

                                    card.innerHTML = `
<div class="kpi-card-info">
<h4>${index + 1}. ${kpi.description || "N/A"}</h4>
<p>التكرار: <span>${kpi.frequency || "-"}</span> | الدرجة القصوى: <span>${kpi.maxScore || 0}</span></p>
</div>
<div class="kpi-card-input">
<div class="score-group">
<label for="score-${kpi.kpiId}">الدرجة:</label>
<input type="number" id="score-${kpi.kpiId}" class="kpi-score-input" 
value="${kpi.scoreAchieved || ""}" 
min="0" max="${kpi.maxScore || 0}" step="0.5" placeholder="0">
</div>
<input type="text" id="notes-${kpi.kpiId}" class="kpi-notes-input" 
value="${kpi.notes || ""}" placeholder="ملاحظات (اختياري)...">
</div>`;
                                    kpiListContainer.appendChild(card);
                        });

                        // عرض إجمالي الدرجات المتاحة
                        if (kpiEmployeeJobTitle) {
                                    kpiEmployeeJobTitle.textContent = `${kpiEmployeeJobTitle.textContent} | إجمالي الدرجات المتاحة: ${totalMaxScore}`;
                        }
            }

            /**
             * (جديد - تنفيذ الطلب الأول والثالث)
             * عند الضغط على "حفظ"
             */
            async function handleKpiSave(event) {
                        event.preventDefault(); // منع إرسال الفورم
                        if (!currentUser) {
                                    showMessage(
                                                kpiMessageArea,
                                                "انتهت الجلسة.",
                                                false,
                                    );
                                    return;
                        }

                        const employeeId = kpiEmployeeSelect.value;
                        const period = `${kpiPeriodSelect.value}-01`;
                        if (!employeeId || !kpiPeriodSelect.value) {
                                    showMessage(
                                                kpiMessageArea,
                                                "اختر الموظف والفترة.",
                                                false,
                                    );
                                    return;
                        }

                        // تجميع الدرجات
                        const scoresToSave = [];
                        const kpiCards =
                                    kpiListContainer.querySelectorAll(
                                                ".kpi-card",
                                    );
                        let validationError = false;

                        kpiCards.forEach((card) => {
                                    const kpiId = card.dataset.kpiId;
                                    const maxScore = parseFloat(
                                                card.dataset.maxScore,
                                    );
                                    const scoreInput =
                                                card.querySelector(
                                                            ".kpi-score-input",
                                                );
                                    const score = scoreInput.value;

                                    // التحقق من أن الدرجة لا تتجاوز الحد الأقصى
                                    const scoreNum = parseFloat(score);
                                    if (
                                                score !== "" &&
                                                (scoreNum < 0 ||
                                                            scoreNum > maxScore)
                                    ) {
                                                scoreInput.style.borderColor =
                                                            "red";
                                                // (تعديل) إظهار رسالة الخطأ في المكان الصحيح
                                                showMessage(
                                                            kpiMessageArea,
                                                            `الدرجة لـ ${kpiId} (${scoreNum}) غير صالحة (الحد الأقصى ${maxScore}).`,
                                                            false,
                                                );
                                                validationError = true;
                                    } else {
                                                scoreInput.style.borderColor =
                                                            ""; // Reset style
                                    }

                                    scoresToSave.push({
                                                kpiId: kpiId,
                                                score:
                                                            score === ""
                                                                        ? null
                                                                        : scoreNum, // إرسال null لو فارغ
                                                maxScore: maxScore, // (مهم) إرسال الدرجة القصوى للسيرفر
                                                notes:
                                                            card.querySelector(
                                                                        ".kpi-notes-input",
                                                            )?.value || "",
                                    });
                        });

                        if (validationError) return; // إيقاف الحفظ لو فيه خطأ

                        // تجهيز الـ Payload
                        const evaluationsData = {
                                    employeeId: employeeId,
                                    period: period,
                                    scores: scoresToSave,
                        };

                        if (
                                    !confirm(
                                                `هل أنت متأكد من حفظ التقييم لـ ${kpiEmployeeSelect.options[kpiEmployeeSelect.selectedIndex].text} عن فترة ${kpiPeriodSelect.value}؟`,
                                    )
                        ) {
                                    return;
                        }

                        // (*** هذا هو السطر الذي تم إصلاحه ***)
                        // (تم حذف حرف 'S' الخاطئ من هنا)
                        try {
                                    // (الطلب الأول والثالث) استدعاء الدالة الجديدة
                                    const response = await callApi(
                                                "saveEvaluations",
                                                {
                                                            evaluationsData:
                                                                        evaluationsData,
                                                            userInfo: currentUser,
                                                },
                                    );
                                    onSaveEvaluationSuccess(response);
                        } catch (error) {
                                    onSaveEvaluationFailure(error);
                        }
            }

            /**
             * (جديد - تنفيذ الطلب الأول)
             * عند نجاح الحفظ
             */
            function onSaveEvaluationSuccess(response) {
                        // (مهم) عرض الرسالة التي تحتوي على النسبة القادمة من السيرفر
                        // (مهم) استخدام kpiSaveMessage بدلاً من kpiMessageArea
                        showMessage(
                                    kpiSaveMessage,
                                    response.message || "تم الحفظ!",
                                    true,
                        );

                        // جعل رسالة النسبة تظهر بوضوح
                        if (kpiSaveMessage)
                                    kpiSaveMessage.style.whiteSpace =
                                                "pre-wrap";

                        // مسح البنود لبدء تقييم جديد
                        kpiListContainer.innerHTML =
                                    "<p>تم الحفظ. الرجاء اختيار موظف وفترة تقييم...</p>";
                        kpiSaveBtn.style.display = "none";
                        kpiEmployeeJobTitle.textContent = "";
                        //kpiEmployeeSelect.value = ''; // (اختياري) إلغاء تحديد الموظف
            }

            /**
             * (جديد) عند فشل الحفظ
             */
            function onSaveEvaluationFailure(error) {
                        // (مهم) استخدام kpiMessageArea لرسائل الخطأ
                        showMessage(kpiMessageArea, error.message, false);
            }

            // --- =================================== ---
            // --- نهاية كود KPIs ---
            // --- =================================== ---
}); // --- END DOMContentLoaded ---
