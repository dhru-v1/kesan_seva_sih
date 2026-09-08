import hashlib
import hmac
import os
import uuid
from datetime import date
from pathlib import Path

from fastapi import FastAPI
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
mongo_client = MongoClient("mongodb://localhost:27017")
database = mongo_client["kisanseva"]
users = database["users"]
bookings = database["bookings"]
settings = database["settings"]
users.create_index("email", unique=True)

DEFAULT_ADMIN_EMAIL = "dhruv@gmail.com"
DEFAULT_MANDIS = ["Mandi 1", "Mandi 2", "Mandi 3", "Mandi 4", "Mandi 5"]


class UserInput(BaseModel):
    name: str = ""
    email: str
    password: str


class BookingInput(BaseModel):
    email: str
    mandi: str
    category: str
    crop_name: str
    quantity: float
    quantity_unit: str = "kg"
    date: str
    timeslot: str


class MandiInput(BaseModel):
    email: str
    mandi_name: str


class AdminSettingsInput(BaseModel):
    admin_email: str
    mandis: list[str]
    admin_mandi: str = "Mandi 1"


class BookingStatusInput(BaseModel):
    status: str


class QueueInput(BaseModel):
    mandi: str
    current_token: int


class ProcurementInput(BaseModel):
    status: str
    timeslot: str | None = None
    actual_weight: float = 0
    quality: str = ""
    price: float = 0
    total_amount: float = 0


def get_password_hash(password):
    salt = os.urandom(16).hex()
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 200000
    ).hex()
    return f"{salt}${password_hash}"


def password_matches(password, stored_hash):
    salt, expected_hash = stored_hash.split("$", 1)
    actual_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 200000
    ).hex()
    return hmac.compare_digest(actual_hash, expected_hash)


settings.update_one(
    {"_id": "app"},
    {"$setOnInsert": {
        "admin_email": DEFAULT_ADMIN_EMAIL,
        "mandis": DEFAULT_MANDIS,
        "admin_mandi": DEFAULT_MANDIS[0]
    }},
    upsert=True
)
app_settings = settings.find_one({"_id": "app"})
admin_email = app_settings["admin_email"]
admin_mandi = app_settings.get("admin_mandi", DEFAULT_MANDIS[0])

users.update_one(
    {"role": "admin"},
    {"$set": {
        "name": "Dhruv",
        "password_hash": get_password_hash("1234"),
        "role": "admin",
        "email": admin_email,
        "mandi_name": admin_mandi
    }},
    upsert=True
)


app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)
app.mount(
    "/js",
    StaticFiles(directory=BASE_DIR / "js"),
    name="js"
)

@app.get("/")
def home():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/index.html")
def index_page():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/home.html")
def farmer_home():
    return FileResponse(BASE_DIR / "home.html")


@app.get("/admin-home.html")
def admin_home():
    return FileResponse(BASE_DIR / "admin-home.html")


@app.get("/bookslot.html")
def book_slot():
    return FileResponse(BASE_DIR / "bookslot.html")


@app.get("/api/mandis")
def get_mandis():
    app_settings = settings.find_one({"_id": "app"})
    return {"mandis": app_settings["mandis"]}


@app.get("/api/admin/settings")
def get_admin_settings():
    app_settings = settings.find_one({"_id": "app"})
    return {
        "admin_email": app_settings["admin_email"],
        "mandis": app_settings["mandis"],
        "admin_mandi": app_settings.get("admin_mandi", DEFAULT_MANDIS[0])
    }


@app.post("/api/admin/settings")
def save_admin_settings(admin_settings: AdminSettingsInput):
    admin_email = admin_settings.admin_email.strip()
    mandis = [mandi.strip() for mandi in admin_settings.mandis]
    admin_mandi = admin_settings.admin_mandi.strip()

    if (not admin_email or len(mandis) != 5 or any(not mandi for mandi in mandis)
            or admin_mandi not in mandis):
        return {"error": "Enter an admin email and assign one of the five mandis"}

    settings.update_one(
        {"_id": "app"},
        {"$set": {
            "admin_email": admin_email,
            "mandis": mandis,
            "admin_mandi": admin_mandi
        }},
        upsert=True
    )
    users.update_one(
        {"role": "admin"},
        {"$set": {"email": admin_email, "mandi_name": admin_mandi}}
    )
    return {"message": "Admin email and mandis saved"}


@app.post("/api/register")
def register(user: UserInput):
    try:
        users.insert_one({
            "name": user.name,
            "email": user.email,
            "password_hash": get_password_hash(user.password),
            "role": "farmer",
            "mandi_name": None
        })
    except DuplicateKeyError:
        return {"error": "Email is already registered"}

    return {"message": "Registration successful"}


@app.post("/api/login")
def login(user: UserInput):
    account = users.find_one({"email": user.email})

    if not account or not password_matches(user.password, account["password_hash"]):
        return {"error": "Invalid email or password"}

    return {"role": account["role"], "email": account["email"]}


@app.post("/api/mandi")
def save_mandi(mandi: MandiInput):
    users.update_one(
        {"email": mandi.email},
        {"$set": {"mandi_name": mandi.mandi_name}}
    )
    return {"message": "Mandi saved"}


@app.post("/api/bookings")
def create_booking(booking: BookingInput):
    token_number = bookings.count_documents({
        "mandi": booking.mandi,
        "date": booking.date
    }) + 1
    bookings.insert_one({
        "booking_id": str(uuid.uuid4()),
        "email": booking.email,
        "mandi": booking.mandi,
        "category": booking.category,
        "crop_name": booking.crop_name,
        "quantity": booking.quantity,
        "quantity_unit": booking.quantity_unit,
        "date": booking.date,
        "timeslot": booking.timeslot,
        "token_number": token_number,
        "status": "waiting",
        "notification": ""
    })
    return {
        "message": "Slot Booking Request Submitted!",
        "token_number": token_number
    }


def public_booking(booking):
    booking.pop("_id", None)
    return booking


@app.get("/api/bookings/{email}")
def get_bookings(email: str):
    return [public_booking(booking) for booking in bookings.find({"email": email})]


@app.put("/api/bookings/{booking_id}")
def update_booking(booking_id: str, booking: BookingInput):
    result = bookings.update_one(
        {"booking_id": booking_id, "email": booking.email},
        {"$set": {
            "mandi": booking.mandi,
            "category": booking.category,
            "crop_name": booking.crop_name,
            "quantity": booking.quantity,
            "quantity_unit": booking.quantity_unit,
            "date": booking.date,
            "timeslot": booking.timeslot,
            "status": "waiting"
        }}
    )
    if result.matched_count == 0:
        return {"error": "Booking not found"}
    return {"message": "Booking updated"}


@app.delete("/api/bookings/{booking_id}")
def delete_booking(booking_id: str, email: str):
    result = bookings.delete_one({"booking_id": booking_id, "email": email})
    if result.deleted_count == 0:
        return {"error": "Booking not found"}
    return {"message": "Booking cancelled"}


@app.get("/api/admin/bookings")
def get_all_bookings(mandi: str | None = None, timeslot: str | None = None):
    query = {"date": date.today().isoformat()}
    if mandi:
        query["mandi"] = mandi
    if timeslot:
        query["timeslot"] = timeslot
    return [public_booking(booking) for booking in bookings.find(query).sort("token_number", 1)]


@app.patch("/api/admin/bookings/{booking_id}")
def update_booking_status(booking_id: str, update: ProcurementInput):
    allowed_statuses = {"waiting", "processing", "completed", "cancelled"}
    if update.status not in allowed_statuses:
        return {"error": "Invalid booking status"}
    changes = {
        "status": update.status,
        "actual_weight": update.actual_weight,
        "quality": update.quality,
        "price": update.price,
        "total_amount": update.total_amount
    }
    if update.timeslot:
        changes["timeslot"] = update.timeslot

    result = bookings.update_one(
        {"booking_id": booking_id},
        {"$set": changes}
    )
    if result.matched_count == 0:
        return {"error": "Booking not found"}
    if update.status == "processing":
        booking = bookings.find_one({"booking_id": booking_id})
        bookings.update_many(
            {
                "booking_id": {"$ne": booking_id},
                "mandi": booking["mandi"],
                "date": booking["date"],
                "status": "processing"
            },
            {"$set": {"status": "waiting"}}
        )
        settings.update_one(
            {"_id": "queue", "mandi": booking["mandi"]},
            {"$set": {"current_token": booking["token_number"]}},
            upsert=True
        )
    elif update.status in {"waiting", "completed", "cancelled"}:
        booking = bookings.find_one({"booking_id": booking_id})
        settings.update_one(
            {
                "_id": "queue",
                "mandi": booking["mandi"],
                "current_token": booking["token_number"]
            },
            {"$set": {"current_token": 0}}
        )
    return {"message": "Booking status updated"}


@app.post("/api/admin/queue")
def update_queue(queue: QueueInput):
    settings.update_one(
        {"_id": "queue"},
        {"$set": {"mandi": queue.mandi, "current_token": queue.current_token}},
        upsert=True
    )
    return {"message": "Current token updated"}


@app.get("/api/queue")
def get_queue(mandi: str):
    processing_booking = bookings.find_one(
        {
            "mandi": mandi,
            "date": date.today().isoformat(),
            "status": "processing"
        },
        sort=[("token_number", 1)]
    )
    if processing_booking:
        return {"current_token": processing_booking["token_number"]}
    return {"current_token": 0}