
//-----------------------------------------------------------------------MONTHS------------------------------------------------------------------//
// Function to toggle the display of the dropdown content
function toggleDropdown() {
    var dropdownContent = document.getElementById("dropdownContent");
    dropdownContent.style.display = dropdownContent.style.display === "none" ? "block" : "none";
}

// Function to set the selected month in the UI and filter data for both tables
function filterData(month) {
    // Update the selected month display
    document.getElementById("selectedMonth").textContent = month;

    // Get the selected date for the chosen month (assuming the year is always 2024)
    var selectedDate = new Date('2024', convertMonthToNumeric(month) - 1);

    // Filter data based on the selected month for table1
    // Filter data based on the selected month for table2
    filterDataByMonth(selectedDate, 'table1');
    filterDataByMonth(selectedDate, 'table2');


    // Hide the dropdown after selection
    toggleDropdown();
}

// Function to filter data based on selected month
function filterDataByMonth(selectedDate, tableId) {
    // Get all table rows for the specified table
    var rows = document.querySelectorAll('#' + tableId + ' tbody tr');

    // Loop through each row and filter based on the selected month
    rows.forEach(function(row) {
        var dateCell = row.querySelector('td:nth-child(4)'); // Assuming date is in the fourth column
        var dateText = dateCell.textContent.trim();
        var rowDate = new Date(dateText);

        // Check if the row date matches the selected month
        if (rowDate.getFullYear() === selectedDate.getFullYear() && rowDate.getMonth() === selectedDate.getMonth()) {
            row.style.display = 'table-row'; // Show the row
        } else {
            row.style.display = 'none'; // Hide the row
        }
    });
}

// Function to convert month name to its numerical value
function convertMonthToNumeric(month) {
    var monthMap = {
        'January': 1,
        'February': 2,
        'March': 3,
        'April': 4,
        'May': 5,
        'June': 6,
        'July': 7,
        'August': 8,
        'September': 9,
        'October': 10,
        'November': 11,
        'December': 12
    };

    return monthMap[month];
}