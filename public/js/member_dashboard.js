function toggleOtherInput() {
    var selectElement = document.getElementById("requestType");
    var otherInput = document.getElementById("otherInput");

    if (selectElement.value === "other") {
        otherInput.style.display = "block";
    } else {
        otherInput.style.display = "none";
    }
}
