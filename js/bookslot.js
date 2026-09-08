// LANGUAGE SYSTEM

const englishBtn = document.querySelector("#english");
const hindiBtn = document.querySelector("#hindi");

const translations = {
    english: {
        title: "Book Slot",
        mandi: "Select Mandi",
        category: "Select Crop Category",
        cropname: "Enter Crop Name",
        quantity: "Quantity",
        date: "Select Date",
        timeslot: "Select Available Time Slot",
        button: "Book Slot"
    },

    hindi: {
        title: "स्लॉट बुक करें",
        mandi: "मंडी चुनें",
        category: "फसल श्रेणी चुनें",
        cropname: "फसल का नाम दर्ज करें",
        quantity: "मात्रा",
        date: "तारीख चुनें",
        timeslot: "समय स्लॉट चुनें",
        button: "स्लॉट बुक करें"
    }
};  

async function loadMandis() {
    const response = await fetch("/api/mandis");
    const { mandis } = await response.json();
    const mandiSelect = document.querySelector("#mandi");
    mandis.forEach((mandi) => {
        const option = document.createElement("option");
        option.value = mandi;
        option.textContent = mandi;
        mandiSelect.appendChild(option);
    });
}

function changeLanguage(lang){

    localStorage.setItem("language", lang);

    document.querySelector(".booking-card h1").innerText =
        translations[lang].title;

    document.querySelector("#mandi option:first-child").text =
        translations[lang].mandi;

    document.querySelector("#category option:first-child").text =
        translations[lang].category;

    document.querySelector("#cropName").placeholder =
        translations[lang].cropname;

    document.querySelector("#quantity").placeholder =
        translations[lang].quantity;

    document.querySelector("#date option:first-child").text =
        translations[lang].date;

    document.querySelector("#timeslot option:first-child").text =
        translations[lang].timeslot;

    document.querySelector("#bookBtn").innerText =
        translations[lang].button;
}

// PAGE LOAD

function populateUpcomingDates(){

    const dateSelect = document.querySelector("#date");
    const today = new Date();

    for(let offset = 0; offset < 7; offset++){

        const date = new Date(today);
        date.setDate(today.getDate() + offset);

        const option = document.createElement("option");
        option.value = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
        option.textContent = date.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });

        dateSelect.appendChild(option);
    }
}

window.onload = async () => {

    populateUpcomingDates();
    await loadMandis();

    const savedLang =
        localStorage.getItem("language") || "english";

    changeLanguage(savedLang);
};

// BUTTON EVENTS

englishBtn.addEventListener("click", () => {
    changeLanguage("english");
});

hindiBtn.addEventListener("click", () => {
    changeLanguage("hindi");
});


// FORM SUBMIT DEMO

document
.querySelector("#bookingForm")
 .addEventListener("submit", async function(e){

    e.preventDefault();

    const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: localStorage.getItem("userEmail"),
            mandi: document.querySelector("#mandi").value,
            category: document.querySelector("#category").value,
            crop_name: document.querySelector("#cropName").value,
            quantity: Number(document.querySelector("#quantity").value),
            quantity_unit: document.querySelector("#quantityUnit").value,
            date: document.querySelector("#date").value,
            timeslot: document.querySelector("#timeslot").value
        })
    });

    const result = await response.json();
    alert(result.message || result.error);
    if (!result.error) {
        window.location.href = "home.html";
    }
});