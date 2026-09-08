document.addEventListener("DOMContentLoaded", async () => {

    const mandiSelect = document.getElementById("mandi");
    const mandiName = document.getElementById("mandiName");
    const currentToken = document.getElementById("currentToken");
    const yourToken = document.getElementById("yourToken");
    const bookingList = document.getElementById("bookingList");
    const userEmail = localStorage.getItem("userEmail");

    const mandisResponse = await fetch("/api/mandis");
    const { mandis } = await mandisResponse.json();
    mandis.forEach((mandi) => {
        const option = document.createElement("option");
        option.value = mandi;
        option.textContent = mandi;
        mandiSelect.appendChild(option);
    });
    mandiName.textContent = mandiSelect.value;

    async function loadQueue() {
        const response = await fetch(`/api/queue?mandi=${encodeURIComponent(mandiSelect.value)}`);
        const queue = await response.json();
        currentToken.textContent = String(queue.current_token).padStart(2, "0");

        const bookingsResponse = await fetch(`/api/bookings/${encodeURIComponent(userEmail)}`);
        const userBookings = await bookingsResponse.json();
        const activeBooking = userBookings.find((booking) =>
            booking.mandi === mandiSelect.value && booking.status !== "cancelled"
        );
        yourToken.textContent = activeBooking ? String(activeBooking.token_number).padStart(2, "0") : "--";
        const statusOrder = ["processing", "waiting", "cancelled", "completed"];
        const statusLabels = {
            processing: "Processing now",
            waiting: "Waiting",
            cancelled: "Cancelled",
            completed: "Completed"
        };
        const statusIcons = {
            processing: "🔄",
            waiting: "🕒",
            cancelled: "❌",
            completed: "✅"
        };
        const sortedBookings = [...userBookings].sort((left, right) =>
            statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status)
                || left.token_number - right.token_number
        );
        bookingList.innerHTML = sortedBookings.length
            ? statusOrder.map((status) => {
                const groupedBookings = sortedBookings.filter((booking) => booking.status === status);
                if (!groupedBookings.length) return "";
                return `
                    <section class="booking-group">
                        <h3>${statusIcons[status]} ${statusLabels[status]}</h3>
                        ${groupedBookings.map((booking) => `
                            <article class="booking-item">
                                <div class="booking-details">
                                    <strong>Token ${booking.token_number} · ${booking.mandi}</strong>
                                    <span>${booking.crop_name} · ${booking.quantity} ${booking.quantity_unit || "kg"}</span>
                                    <small>${booking.date} · ${booking.timeslot}</small>
                                </div>
                                ${booking.status !== "cancelled" && booking.status !== "completed"
                                    ? `<button data-booking-id="${booking.booking_id}" class="cancel-booking">Cancel</button>`
                                    : ""}
                            </article>
                        `).join("")}
                    </section>
                `;
            }).join("")
            : "<p>No bookings yet.</p>";

        bookingList.querySelectorAll(".cancel-booking").forEach((button) => {
            button.addEventListener("click", async () => {
                const response = await fetch(
                    `/api/bookings/${button.dataset.bookingId}?email=${encodeURIComponent(userEmail)}`,
                    { method: "DELETE" }
                );
                const result = await response.json();
                alert(result.message || result.error);
                await loadQueue();
            });
        });
    }

    await loadQueue();
    setInterval(loadQueue, 5000);

    mandiSelect.addEventListener("change", async () => {
        mandiName.textContent = mandiSelect.value;

        await fetch("/api/mandi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: localStorage.getItem("userEmail"),
                mandi_name: mandiSelect.value
            })
        });
        await loadQueue();
    });


    // Language Function

    function setLanguage(lang){

        if(lang === "hindi"){

            document.getElementById("tokenLabel")
            .textContent = "वर्तमान टोकन";

            document.getElementById("mandiLabel")
            .textContent = "मंडी :";

            document.getElementById("yourTokenLabel")
            .textContent = "आपका टोकन :";

            document.getElementById("bookBtn")
            .textContent = "स्लॉट बुक करें";

            document.getElementById("logoutBtn")
            .textContent = "साइन आउट";

        }

        else{

            document.getElementById("tokenLabel")
            .textContent = "CURRENT TOKEN";

            document.getElementById("mandiLabel")
            .textContent = "Mandi :";

            document.getElementById("yourTokenLabel")
            .textContent = "Your Token :";

            document.getElementById("bookBtn")
            .textContent = "Book Slot";

            document.getElementById("logoutBtn")
            .textContent = "Sign Out";

        }

    }

    // Load Saved Language

    const savedLanguage =
        localStorage.getItem("language") || "english";

    setLanguage(savedLanguage);

    // English

    document
    .getElementById("english")
    .addEventListener("click", () => {

        localStorage.setItem(
            "language",
            "english"
        );

        setLanguage("english");

    });

    // Hindi

    document
    .getElementById("hindi")
    .addEventListener("click", () => {

        localStorage.setItem(
            "language",
            "hindi"
        );

        setLanguage("hindi");

    });

    // Book Slot

    document
    .getElementById("bookBtn")
    .addEventListener("click", () => {

        window.location.href =
            "bookslot.html";

    });

    // Sign Out

    document
    .getElementById("logoutBtn")
    .addEventListener("click", () => {

        window.location.href =
            "index.html";

    });

});