function addPoints() {
    var container = document.getElementById('input-fields');
    var currentInputCount = container.children.length;

    // Check if there are already 5 or more input fields
    if (currentInputCount >= 5) {
        alert("A maximum of 5 departure points are allowed.");
        return; // Stop the function from adding more input fields
    }

    var newInputNumber = currentInputCount + 1;
    var input = document.createElement('input');
    input.id = 'departurepoint' + newInputNumber;
    input.className = 'departurepoint';
    input.placeholder = newInputNumber + '. Please enter your postal code';
    container.appendChild(input);

    input.scrollIntoView({ behavior: 'smooth' });
}

let selectedAmenities = []; // Global variable to hold the selected amenities

document.getElementById('amenityForm').addEventListener('submit', function(event) {
    event.preventDefault();
    console.log("button pressed");
    
    // Get all checked checkboxes
    let checkedBoxes = document.querySelectorAll('#amenityForm .form-check-input:checked');
    console.log(`Checked boxes: ${checkedBoxes.length}`); // Log how many boxes are checked
    selectedAmenities = Array.from(checkedBoxes).map(box => box.value);
    console.log(`Selected amenities: ${selectedAmenities}`); // Log the selected amenities
});

function validateForm() {
    const checkboxes = document.querySelectorAll('#amenityForm .form-check-input:checked');
    return checkboxes.length > 0; // Returns true if at least one checkbox is checked
}

// Function to collect departure points from input fields
function collectDeparturePoints() {
    // Select all input elements with class 'departurepoint'
    const inputs = document.querySelectorAll('input.departurepoint');
    // Convert input elements to Array, trim values, and filter out empty values
    const postalCodes = Array.from(inputs).map(input => input.value.trim()).filter(value => value !== '');
    
    console.log(postalCodes); // This will log an array of all non-empty departure point values
    return postalCodes;
}

function search() {
    // Validate the selected amenities
    if (!validateForm()) {
        alert("Please select at least one amenity before submitting.");
        return; // Stop the function if no amenities are selected
    }

    // Collect and validate departure points
    const postalCodes = collectDeparturePoints();
    if (postalCodes.length < 2) {
        alert("Please fill in at least two departure points.");
        return; // Stop the function if fewer than two departure points are provided
    }

    // If both validations pass, proceed with setting localStorage and redirection
    localStorage.setItem('postalCodes', JSON.stringify(postalCodes));
    const amenitiesQuery = selectedAmenities.join(',');
    // Redirect to the interest-point page with amenities query parameters
    window.location.href = `interest-point.html?amenities=${encodeURIComponent(amenitiesQuery)}`;
}