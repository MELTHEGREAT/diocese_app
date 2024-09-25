
    function deleteIncome(incomeId) {
        // Perform an AJAX request to delete the income with the given ID
        // You can use fetch or any other method to make the request
        fetch(`/delete/${incomeId}`, {
            method: 'DELETE', // or 'POST' depending on your server setup
        })
        .then(response => {
            if (response.ok) {
                // Optionally, you can reload the page or update the UI
                // based on the success of the deletion
                location.reload(); // Reload the page
            } else {
                console.error('Failed to delete income');
            }
        })
        .catch(error => console.error('Error during delete:', error));
    }
