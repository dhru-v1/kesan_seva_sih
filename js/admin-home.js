document.addEventListener("DOMContentLoaded", async () => {
    const message = document.getElementById("settingsMessage");
    const tokenList = document.getElementById("tokenList");
    const selectedBooking = document.getElementById("selectedBooking");
    const selectedToken = document.getElementById("selectedToken");
    const timeFilter = document.getElementById("timeFilter");
    const todayLabel = document.getElementById("todayLabel");
    const statusIcons = {
        waiting: "🕒",
        processing: "🔄",
        completed: "✅",
        cancelled: "❌"
    };
    let bookings = [];
    let selectedBookingId = null;

    const response = await fetch("/api/admin/settings");
    const settings = await response.json();
    todayLabel.textContent = new Date().toLocaleDateString();

    async function loadBookings() {
        const response = await fetch(
            `/api/admin/bookings?mandi=${encodeURIComponent(settings.admin_mandi)}&timeslot=${encodeURIComponent(timeFilter.value)}`
        );
        bookings = await response.json();
        if (!bookings.length) {
            tokenList.innerHTML = "<p>No bookings available today.</p>";
            selectedBooking.innerHTML = "<p>Select a token to view its details.</p>";
            selectedToken.textContent = "--";
            return;
        }
        if (!selectedBookingId || !bookings.some((booking) => booking.booking_id === selectedBookingId)) {
            selectedBookingId = bookings[0].booking_id;
        }
        renderTokens();
        renderSelectedBooking();
    }

    function renderTokens() {
        tokenList.innerHTML = bookings.map((booking) => `
            <button type="button" class="token-button ${booking.booking_id === selectedBookingId ? "active" : ""}" data-booking-id="${booking.booking_id}">
                <span class="token-number">${statusIcons[booking.status] || ""} #${booking.token_number}</span>
                <span class="token-crop">${booking.crop_name}</span>
            </button>
        `).join("");
        tokenList.querySelectorAll(".token-button").forEach((button) => {
            button.addEventListener("click", async () => {
                const nextBookingId = button.dataset.bookingId;
                const previousBooking = bookings.find((item) => item.booking_id === selectedBookingId);
                const booking = bookings.find((item) => item.booking_id === nextBookingId);

                if (previousBooking && previousBooking.booking_id !== nextBookingId
                        && previousBooking.status === "processing") {
                    await updateBooking("waiting", previousBooking.booking_id, false);
                }

                selectedBookingId = nextBookingId;
                if (booking.status === "waiting") {
                    await updateBooking("processing", selectedBookingId, false);
                }
                await loadBookings();
                renderTokens();
                renderSelectedBooking();
            });
        });
    }

    function renderSelectedBooking() {
        const booking = bookings.find((item) => item.booking_id === selectedBookingId);
        if (!booking) return;
        selectedToken.textContent = `#${booking.token_number}`;
        selectedBooking.innerHTML = `
            <p><strong>${booking.email}</strong></p>
            <p>${booking.crop_name} · ${booking.category} · ${booking.quantity} ${booking.quantity_unit || "kg"}</p>
            <p>${booking.date} · ${booking.timeslot} · ${booking.mandi}</p>
            <p>Status: <strong>${statusIcons[booking.status]} ${booking.status}</strong></p>
            <label>Actual weight <input id="selectedWeight" type="number" min="0" value="${booking.actual_weight || ""}"></label>
            <label>Quality / grade <input id="selectedQuality" type="text" value="${booking.quality || ""}"></label>
            <label>Price / MSP <input id="selectedPrice" type="number" min="0" value="${booking.price || ""}"></label>
            <label>Total amount <input id="selectedAmount" type="number" min="0" value="${booking.total_amount || ""}"></label>
            <div class="slot-actions">
                ${booking.status !== "cancelled" && booking.status !== "completed"
                    ? `<button type="button" id="cancelSelectedBooking" class="cancel-button">Cancel</button>`
                    : ""}
                ${booking.status !== "cancelled" && booking.status !== "completed"
                    ? `<button type="button" id="completeSelectedBooking">Paid</button>`
                    : ""}
            </div>
        `;
        const cancelButton = document.getElementById("cancelSelectedBooking");  
        const completeButton = document.getElementById("completeSelectedBooking");
        if (cancelButton) cancelButton.addEventListener("click", () => updateBooking("cancelled"));
        if (completeButton) completeButton.addEventListener("click", () => updateBooking("completed"));
    }

    async function updateBooking(status, bookingId = selectedBookingId, refresh = true) {
        const booking = bookings.find((item) => item.booking_id === bookingId);
        const isSelectedBooking = bookingId === selectedBookingId;
        const response = await fetch(`/api/admin/bookings/${bookingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status,
                actual_weight: isSelectedBooking
                    ? Number(document.getElementById("selectedWeight").value || 0)
                    : Number(booking.actual_weight || 0),
                quality: isSelectedBooking
                    ? document.getElementById("selectedQuality").value
                    : booking.quality || "",
                price: isSelectedBooking
                    ? Number(document.getElementById("selectedPrice").value || 0)
                    : Number(booking.price || 0),
                total_amount: isSelectedBooking
                    ? Number(document.getElementById("selectedAmount").value || 0)
                    : Number(booking.total_amount || 0)
            })
        });
        const result = await response.json();
        message.textContent = result.message || result.error;
        if (!result.error && refresh) await loadBookings();
    }

    await loadBookings();

    timeFilter.addEventListener("change", async () => {
        selectedBookingId = null;
        await loadBookings();
    });

});