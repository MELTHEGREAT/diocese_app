function deleteIncome(incomeId) {
    fetch(`/income/delete/${incomeId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        console.log(data); // Handle success or error response
        // You can refresh the page or update the UI as needed
    })
    .catch(error => {
        console.error('Error deleting income:', error);
    });
}
