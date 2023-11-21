
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid



# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///appointments.db'
db = SQLAlchemy(app)

# Available Slots Model
class AvailableSlots(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    week = db.Column(db.String(10), nullable=False)
    day = db.Column(db.String(10), nullable=False)
    hour = db.Column(db.Integer, nullable=False)
    # status = db.Column(db.String(10), default="available")

# Appointments Model
class Appointments(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    week = db.Column(db.String(10), nullable=False)
    day = db.Column(db.String(10), nullable=False)
    hour = db.Column(db.Integer, nullable=False)
    client_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    cancellation_code = db.Column(db.String(36), unique=True, nullable=False)

# AdminAvailability Model
class AdminAvailability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    week = db.Column(db.String(10), nullable=False)
    day = db.Column(db.String(10), nullable=False)
    hour = db.Column(db.Integer, nullable=False)

# Initialize database within application context
with app.app_context():
    db.create_all()

@app.route("/book")
def booking_page():
    return render_template("user_interface.html")

@app.route("/admin")
def admin_page():
    return render_template("admin_panel.html")

@app.route("/")
def index():
    return render_template("landingpage.html")

    
@app.route("/clear_admin_availability", methods=['DELETE'])
def clear_admin_availability():
    week = request.args.get('week')
    AdminAvailability.query.filter_by(week=week).delete()
    db.session.commit()
    return jsonify({"message": f"Availability for {week} cleared"}), 200

@app.route("/clear_all_admin_availability", methods=['DELETE'])
def clear_all_admin_availability():
    AdminAvailability.query.delete()
    db.session.commit()
    return jsonify({"message": "All availability cleared"}), 200


@app.route("/set_admin_availability", methods=['POST'])
def set_admin_availability():
    data = request.get_json()
    week = data.get('week')
    availability = data.get('availability')
    
    # Delete existing availability for the week
    AdminAvailability.query.filter_by(week=week).delete()
    
    # Add new availability
    for slot in availability:
        new_availability = AdminAvailability(week=week, day=slot['day'], hour=int(slot['hour']))
        db.session.add(new_availability)
    
    db.session.commit()
    return jsonify({"message": "Availability set"}), 201


@app.route("/create_appointment", methods=['POST'])
def create_appointment():
    try:
        data = request.get_json()
        client_name = data.get('client_name')
        email = data.get('email')
        phone = data.get('phone')
        date = data.get('date')
        time = int(data.get('time'))

        if not date:
            return jsonify({"message": "Date is missing"}), 400

        # Convert to standard date and time format
        try:
            standard_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"message": "Incorrect date format, should be YYYY-MM-DD"}), 400

        standard_time = time

        # Generate a cancellation code
        cancellation_code = str(uuid.uuid4())

        new_appointment = Appointments(
            week=standard_date.strftime("%U"),
            day=standard_date.strftime("%A"),
            hour=standard_time,
            client_name=client_name,
            email=email,
            phone=phone,
            cancellation_code=cancellation_code
        )

        db.session.add(new_appointment)
        db.session.commit()

        return jsonify({"message": "Appointment created", "cancellation_code": cancellation_code}), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 400


@app.route("/cancel_appointment", methods=['POST'])
def cancel_appointment():
    # Existing code here
    pass

@app.route("/get_available_slots", methods=['GET'])
def get_available_slots():
    # Existing code here
    pass

from datetime import date

def get_week_label(target_date):
    # Define the starting date of our custom calendar
    start_date = date(2023, 9, 30)
    
    # Calculate the difference in days between the target and starting date
    delta_days = (target_date - start_date).days
    
    # Calculate the week number based on the difference
    week_number = (delta_days // 7) + 1
    
    return f"Week {week_number}"

@app.route("/get_available_slots_for_date", methods=['GET'])
def get_available_slots_for_date():
    date_requested = request.args.get('date')
    
    # Convert the string date to a date object
    date_obj = datetime.strptime(date_requested, "%Y-%m-%d").date()

    # Get the week label for the requested date
    week_label = get_week_label(date_obj)

    # Fetch admin availability for the week label
    admin_slots = AdminAvailability.query.filter_by(week=week_label).all()
    
    # Fetching all booked appointments for the requested date
    booked_appointments = Appointments.query.filter_by(day=date_requested).all()
    booked_hours = [appointment.hour for appointment in booked_appointments]
    
    # Filtering out already booked slots
    available_slots = [
        {"week": slot.week, "day": slot.day, "hour": slot.hour}
        for slot in admin_slots if slot.hour not in booked_hours
    ]
    
    return jsonify(available_slots)

@app.route("/get_admin_availability", methods=['GET'])
def get_admin_availability():
    week = request.args.get('week')
    availability = AdminAvailability.query.filter_by(week=week).all()
    
    # Convert the results to a list of dictionaries
    availability_list = [{"week": slot.week, "day": slot.day, "hour": slot.hour} for slot in availability]
    
    return jsonify(availability_list)

@app.route("/fetch_appointments", methods=['GET'])
def fetch_appointments():
    appointments = Appointments.query.all()
    appointments_list = []
    for appointment in appointments:
        appointments_list.append({
            "id": appointment.id,
            "week": appointment.week,
            "day": appointment.day,
            "hour": appointment.hour,
            "client_name": appointment.client_name,
            "email": appointment.email,
            "phone": appointment.phone,
            "cancellation_code": appointment.cancellation_code
        })
    return jsonify(appointments_list), 200

if __name__ == "__main__":
    app.run(debug=True, port=5002)
