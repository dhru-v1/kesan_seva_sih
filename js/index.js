document.addEventListener("DOMContentLoaded", () => {

    const loginSection =
        document.getElementById("loginSection");

    const registerSection =
        document.getElementById("registerSection");

    const showRegister =
        document.getElementById("showRegister");

    const showLogin =
        document.getElementById("showLogin");

    // Language Function

    function setLanguage(lang) {

        if (lang === "hindi") {

            document.getElementById("heroTitle").textContent =
                "स्मार्ट खरीद कतार प्रबंधन";

            document.getElementById("heroText").textContent =
                "किसानों की प्रतीक्षा समय कम करने हेतु";

            document.getElementById("loginHeading").textContent =
                "किसान लॉगिन";

            document.getElementById("registerHeading").textContent =
                "किसान पंजीकरण";

            document.getElementById("newUserText").textContent =
                "नया उपयोगकर्ता?";

            document.getElementById("alreadyText").textContent =
                "पहले से खाता है?";

            document.getElementById("loginBtn").textContent =
                "लॉगिन";

            document.getElementById("registerBtn").textContent =
                "पंजीकरण";

            document.getElementById("showRegister").textContent =
                "रजिस्टर करें";

            document.getElementById("showLogin").textContent =
                "लॉगिन";

        } else {

            document.getElementById("heroTitle").textContent =
                "Smart Procurement Queue Management";

            document.getElementById("heroText").textContent =
                "Helping Farmers Reduce Waiting Time at Procurement Centres";

            document.getElementById("loginHeading").textContent =
                "Farmer Login";

            document.getElementById("registerHeading").textContent =
                "Farmer Registration";

            document.getElementById("newUserText").textContent =
                "New User?";

            document.getElementById("alreadyText").textContent =
                "Already have an account?";

            document.getElementById("loginBtn").textContent =
                "Login";

            document.getElementById("registerBtn").textContent =
                "Register";

            document.getElementById("showRegister").textContent =
                "Register Here";

            document.getElementById("showLogin").textContent =
                "Login";

        }
    }

    // Load saved language

    const savedLanguage =
        localStorage.getItem("language") || "english";

    setLanguage(savedLanguage);

    // Language Buttons

    document
        .getElementById("english")
        .addEventListener("click", () => {

            localStorage.setItem(
                "language",
                "english"
            );

            setLanguage("english");

        });

    document
        .getElementById("hindi")
        .addEventListener("click", () => {

            localStorage.setItem(
                "language",
                "hindi"
            );

            setLanguage("hindi");

        });

    // Show Register

    showRegister.addEventListener("click", (e) => {

        e.preventDefault();

        loginSection.style.display = "none";
        registerSection.style.display = "block";

    });

    // Show Login

    showLogin.addEventListener("click", (e) => {

        e.preventDefault();

        registerSection.style.display = "none";
        loginSection.style.display = "block";

    });

    // Login

    document
        .getElementById("loginForm")
        .addEventListener("submit", async (e) => {

            e.preventDefault();

            const inputs = e.target.querySelectorAll("input");
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inputs[0].value,
                    password: inputs[1].value
                })
            });

            const result = await response.json();
            if (result.error) {
                alert(result.error);
                return;
            }

            localStorage.setItem("userEmail", result.email);

            window.location.href = result.role === "admin"
                ? "admin-home.html"
                : "home.html";

        });

    // Register

    document
        .getElementById("registerForm")
        .addEventListener("submit", async (e) => {

            e.preventDefault();

            const inputs = e.target.querySelectorAll("input");
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: inputs[0].value,
                    email: inputs[1].value,
                    password: inputs[2].value
                })
            });

            const result = await response.json();
            if (result.error) {
                alert(result.error);
                return;
            }

            alert(result.message);
            showLogin.click();

        });

});