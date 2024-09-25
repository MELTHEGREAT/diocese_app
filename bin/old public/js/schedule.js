// schedule.js
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('scheduleRequestForm');
    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the form from submitting normally

        // Show loading spinner
        document.getElementById('loadingSpinner').style.display = 'block';

        // Simulate a delay before showing success message (3 seconds in this example)
        setTimeout(function () {
            // Hide loading spinner
            document.getElementById('loadingSpinner').style.display = 'none';

            // Show success message
            document.getElementById('successMessage').style.display = 'block';

            // Optionally, submit the form via AJAX here
            // You may use fetch or XMLHttpRequest to send form data to the server
        }, 3000); // Change 3000 to the desired delay in milliseconds
    });
});
