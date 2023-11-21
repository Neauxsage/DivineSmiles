// JavaScript for User Interface

// Fetch available slots and populate the calendar
async function fetchAvailableSlots(date) {
    const response = await fetch(`/get_available_slots_for_date?date=${date}`);
    const data = await response.json();
    
    // You need to determine the weekStartDate based on your logic
    // For demonstration, I'm assuming it's the same as the selected date.
    const weekStartDate = date;

    // This will now populate only the slots available for that date
    populateTimeButtons(data, weekStartDate);
}


function getActualDate(startDate, dayString) {
    const dayMapping = { "M": 0, "Tu": 1, "W": 2, "Th": 3, "F": 4, "S": 5, "Su": 6 };
    const start = new Date(startDate); // Assuming startDate is in a valid date format
    start.setDate(start.getDate() + dayMapping[dayString]);
    return start;
}

function populateTimeButtons(slots, weekStartDate) {
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    timeSlotsContainer.innerHTML = ''; // Clear existing buttons

    // Group slots by day
    const slotsByDay = {};
    slots.forEach(slot => {
        if (!slotsByDay[slot.day]) {
            slotsByDay[slot.day] = [];
        }
        slotsByDay[slot.day].push(slot);
    });

    // Create buttons organized by day
    Object.keys(slotsByDay).forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-group';
        dayDiv.innerHTML = `<h4>${day}</h4>`;
        
        slotsByDay[day].forEach(slot => {
            const button = document.createElement('button');
            button.type = "button";  // Explicitly set button type to "button"

            const actualDate = getActualDate(weekStartDate, slot.day).toLocaleDateString();
            button.value = `${slot.day}, ${actualDate} ${slot.hour}:00`;
            button.textContent = `${actualDate} ${slot.hour}:00`;

            if (typeof actualDate !== 'undefined' && actualDate !== '') {
                button.dataset.actualDate = actualDate;  // Store the actualDate in data-attribute
            }

            button.addEventListener('click', function() {
                if (typeof this.dataset.actualDate !== 'undefined') {
                    document.getElementById('date').value = this.dataset.actualDate;
                }
                
                // If you need to store the selected time for later use, you can set it to a hidden input
                const selectedTimeInput = document.getElementById('selectedTime');
                if (!selectedTimeInput) {
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id = 'selectedTime';
                    hiddenInput.name = 'time';
                    timeSlotsContainer.appendChild(hiddenInput);
                }
                document.getElementById('selectedTime').value = button.value;
                
                // Highlight the selected button (you can add more styling here)
                const allButtons = timeSlotsContainer.querySelectorAll('button');
                allButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            });

            dayDiv.appendChild(button);
        });

        timeSlotsContainer.appendChild(dayDiv);
    });
}



// Handle date change to update available time slots
document.getElementById('date').addEventListener('change', function(event) {
    const selectedDate = event.target.value;
    fetchAvailableSlots(selectedDate);
});

// Handle form submission
document.getElementById('booking-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const client_name = document.getElementById('client_name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('selectedTime').value.split(' ')[2].split(':')[0];

    
    const response = await fetch('/create_appointment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ client_name, email, phone, date, time })
    });

    const data = await response.json();
    if (response.status === 201) {
        // Show confirmation and cancellation code
        document.getElementById('cancellation_code').innerText = data.cancellation_code;
        document.getElementById('booking-form').style.display = 'none';
        document.getElementById('confirmation').style.display = 'block';
    } else {
        // Handle errors
        alert(data.message);
    }
});
