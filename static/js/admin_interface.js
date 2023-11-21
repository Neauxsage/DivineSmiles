const days = ["M", "Tu", "W", "Th", "F", "S", "Su"];
const hours = Array.from({length: 12}, (_, i) => i+8);
let slots = {};

let isSelecting = false;

function getFirstMonday(year) {
    let date = new Date(year, 8, 30);  // Starting from 9/30/2023
    while (date.getDay() !== 1) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

function generateWeeksForYear(year) {
    const weeks = [];
    let date = getFirstMonday(year);
    for (let i = 1; i <= 52; i++) {
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 6);
        weeks.push({
            weekNum: `Week ${i}`,
            startDate: new Date(date),
            endDate: endDate
        });
        date.setDate(date.getDate() + 7);
    }
    return weeks;
}

const currentYear = new Date().getFullYear();
const weeksForYear = generateWeeksForYear(currentYear);

const weekSelect = document.getElementById('availability-week');
weeksForYear.forEach((week) => {
    const option = document.createElement('option');
    option.value = week.weekNum;
    option.textContent = `${week.weekNum} (${week.startDate.toLocaleDateString()} - ${week.endDate.toLocaleDateString()})`;
    weekSelect.appendChild(option);
});

function initializeCalendar() {
    const calendarDiv = document.getElementById('availability-calendar');
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.classList.add('day-header');
        dayHeader.innerText = day;
        calendarDiv.appendChild(dayHeader);
    });
    hours.forEach(hour => {
        days.forEach(day => {
            const slotDiv = document.createElement('div');
            slotDiv.classList.add('day-slot');
            slotDiv.dataset.day = day;
            slotDiv.dataset.hour = hour;
            slotDiv.innerText = `${hour}:00`;
            slotDiv.addEventListener('mousedown', startSelection);
            slotDiv.addEventListener('mouseover', toggleSlot);
            slotDiv.addEventListener('mouseup', endSelection);
            calendarDiv.appendChild(slotDiv);
        });
    });
}

function toggleSlot(event) {
    const slotDiv = event.currentTarget;
    const day = slotDiv.dataset.day;
    const hour = slotDiv.dataset.hour;
    const week = document.getElementById('availability-week').value;
    if (!slots[week]) {
        slots[week] = [];
    }
    if (isSelecting || event.type === 'click') {
        if (slotDiv.classList.contains('active')) {
            slotDiv.classList.remove('active');
            slots[week] = slots[week].filter(slot => slot.day !== day || slot.hour !== hour);
        } else {
            slotDiv.classList.add('active');
            slots[week].push({day, hour: parseInt(hour)});
        }
    }
}

function startSelection(event) {
    isSelecting = true;
    toggleSlot(event);
}

function endSelection() {
    isSelecting = false;
}

async function submitAvailability() {
    const week = document.getElementById('availability-week').value;
    const response = await fetch('/set_admin_availability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ week: week, availability: slots[week] || [] })
    });
    const data = await response.json();
    if (response.status === 201) {
        alert(data.message);
        fetchAndDisplayAvailability();
    } else {
        alert(data.error);
    }
}

async function fetchAndDisplayAvailability() {
    const week = document.getElementById('availability-week').value;
    const availabilityDiv = document.getElementById('current-availability');
    Array.from(document.getElementsByClassName('day-slot')).forEach(slotDiv => {
        slotDiv.classList.remove('active');
    });
    const response = await fetch(`/get_admin_availability?week=${week}`);
    const availability = await response.json();
    slots[week] = availability;
    if (availability.length === 0) {
        availabilityDiv.innerHTML = '<p>No availability set for this week.</p>';
        return;
    }
    availabilityDiv.innerHTML = '';
    availability.forEach(slot => {
        availabilityDiv.innerHTML += `<div>${slot.week} - ${slot.day} - ${slot.hour}:00</div>`;
        Array.from(document.getElementsByClassName('day-slot')).forEach(slotDiv => {
            if (slotDiv.dataset.day === slot.day && parseInt(slotDiv.dataset.hour) === slot.hour) {
                slotDiv.classList.add('active');
            }
        });
    });
}

function clearCurrentWeekAvailability() {
    const week = document.getElementById('availability-week').value;
    fetch(`/clear_admin_availability?week=${week}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchAndDisplayAvailability();
        });
}

function clearAllWeeksAvailability() {
    fetch('/clear_all_admin_availability', { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchAndDisplayAvailability();
        });
}

document.getElementById('clear-current-week').addEventListener('click', clearCurrentWeekAvailability);
document.getElementById('clear-all-weeks').addEventListener('click', clearAllWeeksAvailability);
document.getElementById('submit-availability').addEventListener('click', submitAvailability);

window.onload = () => {
    initializeCalendar();
    fetchAndDisplayAvailability();
};
