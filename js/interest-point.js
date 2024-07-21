// Global variables to store the start and end points
let startingCoordinates = null;
let endingCoordinates = null;
// Variable to keep track of the current routing control
let currentRoutingControl = null; 

var isTracking = false; // Keep track of tracking state
var userMarker; // Marker for the user's location
var accuracyCircle; // Define a variable to hold the circle


// Initialise the map and set it to the coordinates of Singapore
var map = L.map('map').setView([1.3521, 103.8198], 14);

// Add OpenStreetMap tile layer to the map:
L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
    }).addTo(map);

// Overpass API URL
var overpassApiUrl = "https://overpass-api.de/api/interpreter";

// Placeholder for stored markers (using an object for multiple queries)
var storedMarkers = {};

// Query nominatim API using user's postal codes
function geocodePostalCode(postalCode) {
    const countryCode = 'SG'; // Singapore country code
    // Construct the request URL for Nominatim API, including the postal code, country code, and limiting the results to 1
    const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(postalCode)}&countrycodes=${countryCode}&limit=1`;

    // Use the Fetch API to send the request to the Nominatim API
    return fetch(url)
        .then(response => response.json()) // Parse the JSON response from the API
        .then(data => {
            if (data.length > 0) {
                // Return an object containing the latitude and longitude of the first result
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
            return null; // Return null if no data found
        })
        .catch(error => {
            console.error('Geocoding error:', error);
            return null; // Return null in case of error
        });
} 

function calculateGeographicMidpoint(coordinates) {
    let x = 0.0;
    let y = 0.0;
    let z = 0.0;

    coordinates.forEach(coord => {
        // Convert latitude and longitude from degrees to radians
        let lat = coord.lat * Math.PI / 180;
        let lon = coord.lon * Math.PI / 180;

        // Convert lat/lon to Cartesian coordinates
        x += Math.cos(lat) * Math.cos(lon);
        y += Math.cos(lat) * Math.sin(lon);
        z += Math.sin(lat);
    });

    // Compute average x, y, and z coordinates
    x /= coordinates.length;
    y /= coordinates.length;
    z /= coordinates.length;

    // Convert average x, y, z coordinate to latitude and longitude
    let centralLon = Math.atan2(y, x);
    let centralSquareRoot = Math.sqrt(x * x + y * y);
    let centralLat = Math.atan2(z, centralSquareRoot);

    // Convert radians back to degrees
    centralLat = centralLat * 180 / Math.PI;
    centralLon = centralLon * 180 / Math.PI;

    return { lat: centralLat, lon: centralLon };
}

// Ensure the DOM is fully loaded before executing the script
window.addEventListener('load', () => {
    // Retrieve stored postal codes from localStorage and parse them back into an array
    const postalCodes = JSON.parse(localStorage.getItem('postalCodes'));
    // Use Promise.all to execute geocoding for all postal codes in parallel
    Promise.all(postalCodes.map(postalCode => geocodePostalCode(postalCode)))
        .then(coordinates => {
            // Filter out any null values to ensure only valid coordinates are processed
            const validCoordinates = coordinates.filter(coord => coord != null);
            // Check if there are any valid coordinates after filtering
            if (validCoordinates.length > 0) {
                // Display markers on the map for each of the valid coordinates
                displayPostalCodeMarkers(validCoordinates);
                // Calculate the geographic midpoint (average coordinate) of all valid coordinates
                const midpointCoord = calculateGeographicMidpoint(validCoordinates);
                // Query amenities based on the average coordinate to find points of interest around the central location
                queryAmenities(midpointCoord.lat, midpointCoord.lon);
            } else {
                // Log a message if no valid coordinates were found (i.e., all geocoding attempts returned null)
                console.log("No valid coordinates found.");
            }
        });
});

// Function to display markers for postal codes
async function displayPostalCodeMarkers(coordinates) {
    return new Promise(async (resolve, reject) => {
        if (coordinates.length === 0) {
            reject("No coordinates provided");
            return;
        }

        let processedCoordinates = []; // Array to hold the processed coordinates

        for (const coord of coordinates) {
            const address = await reverseGeocode(coord.lat, coord.lon); // Fetch the address for each coordinate
            var marker = L.marker([coord.lat, coord.lon]).addTo(map);
            marker.bindPopup(`<b>${address || "Address not available"}</b>`); // Use the fetched address in the popup

            // Attach click event listener to each marker
            marker.on('click', function() {
                if (currentRoutingControl) {
                    currentRoutingControl.remove();
                }
                startingCoordinates = { lat: coord.lat, lon: coord.lon };
                checkAndPerformRouting(startingCoordinates, endingCoordinates);
            });
            processedCoordinates.push({ lat: coord.lat, lon: coord.lon });
        }
        resolve(processedCoordinates); // Resolve with all the processed coordinates
    });
}

function queryAmenities(latitude, longitude) {
    // Parse the URL query parameters for amenities
    const params = new URLSearchParams(window.location.search);
    const amenities = params.get('amenities').split(',');
    // Initialise an array to hold parts of the Overpass API query for each amenity type.
    let nodeQueryParts = [];
    const radius = 2500; 
    // Iterate over each amenity type provided in the 'amenities' list.
    amenities.forEach(amenity => {
        // Trim whitespace from the amenity string and check if it's not empty.
        if (amenity.trim() !== '') {
            // Construct an Overpass API query part for this amenity type, specifying the search radius and central location.
            nodeQueryParts.push(`node["amenity"="${amenity}"](around:${radius},${latitude},${longitude});`);
        }
    });
    // The query requests JSON output
    let query = `
    [out:json];
    (
        ${nodeQueryParts.join('\n')}
    );
    out center;`;
    // `sendQuery` is a separate function responsible for communicating with the Overpass API.
    sendQuery(query);
}


// Function to send the query to the Overpass API
function sendQuery(query) {
    // Execute a POST request to the Overpass API URL using the fetch API
    fetch(overpassApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({data: query})
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        // If the response is OK, parse the JSON body of the response
        return response.json();
    })
    .then(data => {
        // Process the data received from the Overpass API by calling `processEndingCoordinates`
        return processEndingCoordinates(data);
    })
    .catch(error => console.error('Fetch error:', error));
}

// Async function for processing ending coordinates
async function processEndingCoordinates(endData) {
    try {
        // Display the results on the map by calling `displayResultsOnMap`
        const { lat, lon } = await displayResultsOnMap(endData);
        // Store the received coordinates as the ending point for further use, such as routing
        endingCoordinates = { lat, lon };
        // Call `checkAndPerformRouting` to initiate routing if both starting and ending coordinates are set
        checkAndPerformRouting();
    } catch (error) {
        // If an error occurs alert the user and redirect
        alert("No results found. Redirecting back to the main page.");
        window.location.href = 'index.html'; // Redirect user back to index.html
    }
}

// Application logo for use as a destination marker on the map
var destinationIcon = L.icon({
    iconUrl: 'images/logo.png',
    iconSize:     [55, 55],
    iconAnchor:   [25, 25], // point of the icon which will correspond to marker's location
});

function displayResultsOnMap(data) {
    return new Promise(async (resolve, reject) => {
        clearMapMarkers(); // Clear existing markers
        // Check if the data has elements and if there are any elements to process
        if (data.elements && data.elements.length > 0) {
            // Select a random element from the data to display
            let randomIndex = Math.floor(Math.random() * data.elements.length);
            let selectedElement = data.elements[randomIndex];
            if (selectedElement.type === 'node') {
                // Retrieve the necessary properties from the selected element
                const { lat, lon, tags } = selectedElement;
                const address = await reverseGeocode(lat, lon); // Get address
                const photo = await fetchUnsplashPhoto(tags.amenity); // Get photo URL
                // Add a marker for the selected element
                var marker = L.marker([lat, lon], {icon: destinationIcon}).addTo(map);
                marker.bindPopup(`<b>${tags.name || "Unnamed location"}</b><br>${address || "Address not available"}`);

                // Update HTML elements with the selected place's details
                document.getElementById('place-name').textContent = tags.name || "Not available";
                document.getElementById('place-address').textContent = address || "Not available";
                document.getElementById('unsplash-image').src = photo; // Assuming `fetchUnsplashPhoto` returns the photo URL

                // Resolve with the selected place's details
                resolve({ lat, lon, name: tags.name, address, photo });

                // Display the rest of the results excluding the selected one
                displayRestOfResults(data, randomIndex);
            } else {
                reject(new Error("Selected element is not a usable node"));
            }
        } else {
            reject(new Error("No elements found in the data"));
        }
    });
}

// Displays additional points of interest (POIs) excluding the main selected one.
async function displayRestOfResults(data, excludedIndex) {
    const listContainer = document.getElementById('nearby-points-list');
    listContainer.innerHTML = ''; // Clear existing list items

    let counter = 0; // Initialise a counter for added list items
    const maxItems = 5; // Set the maximum number of items to display

    for (let [index, element] of data.elements.entries()) {
        // Stop adding items if the counter reaches maxItems
        if (counter >= maxItems) break;

        // Skip the excludedIndex and non-node elements
        if (index === excludedIndex || element.type !== 'node') continue;
        const { lat, lon, tags } = element;
        const address = await reverseGeocode(lat, lon);
        // Fetch a representative photo URL based on the element's amenity type.
        const photoUrl = await fetchUnsplashPhoto(tags.amenity);

        // Create list item for each place
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="list-item-content">
                <img src="${photoUrl}" class="img-fluid float-left mr-3">
                <div>
                    <h4>${tags.name || 'Unnamed Location'}</h4>
                    <p>${address || 'Address not available'}</p>
                </div>
            </div>
        `;
        listContainer.appendChild(listItem);
        listItem.setAttribute('data-lat', lat);
        listItem.setAttribute('data-lon', lon);
        listItem.addEventListener('mouseenter', function() {
            const lat = parseFloat(this.getAttribute('data-lat'));
            const lon = parseFloat(this.getAttribute('data-lon'));
            // Create a temporary red marker to indicate other points of interests
            const tempMarker = L.marker([lat, lon], {
                icon: L.icon({
                    iconUrl: 'images/other-markers.png',
                    iconSize: [41, 41], // Size of the icon
                    iconAnchor: [25, 25], // Point of the icon which will correspond to marker's location
                })
            }).addTo(map);
            // Store the marker in the listItem for later removal
            this.tempMarker = tempMarker;
        });
        listItem.addEventListener('mouseleave', function() {
            // Remove the temporary marker
            if (this.tempMarker) {
                map.removeLayer(this.tempMarker);
                delete this.tempMarker; // Clean up
            }
        });
        counter++; // Increment the counter for each added item
    }
}

function clearMapMarkers() {
    // Clear existing markers from the map
    Object.keys(storedMarkers).forEach(poiType => {
        storedMarkers[poiType].forEach(marker => {
            map.removeLayer(marker);
        });
    });
    storedMarkers = {}; // Reset the storedMarkers object
}

function tryExecuteRouting() {
    if (startPointReady && endPointReady) {
        // Both start and end points are ready, execute routing
        routing(startPoint, endPoint).then(() => {
            console.log("Routing executed successfully.");
        }).catch(error => {
            console.error("Routing error:", error);
        });
    } else {
        // Waiting for both points to be ready
        console.log("Waiting for start and end points to be ready.");
    }
}

// Check if both starting and ending coordinates are available, then perform routing
function checkAndPerformRouting() {
    if (startingCoordinates && endingCoordinates) {
        performRouting(startingCoordinates, endingCoordinates);
    }
}

function performRouting(start, end) {
    currentRoutingControl = L.Routing.control({
        waypoints: [
            L.latLng(start.lat, start.lon),
            L.latLng(end.lat, end.lon)
        ],
        lineOptions: {
            styles: [{color: '#000080', opacity: 0.8, weight: 4}] // Customize route color
        },
        createMarker: function(i, waypoint, n) {
            return null; // Suppress default markers
        },
    }).addTo(map);

    // Listen for the 'routesfound' event
    currentRoutingControl.on('routesfound', function(e) {
        var routes = e.routes;
        var summary = routes[0].summary;
        
        // Fit map to route bounds with some padding
        var bounds = L.latLngBounds(routes[0].coordinates);
        map.fitBounds(bounds, {padding: [50, 50]});

        // Duration in seconds
        var durationInSeconds = summary.totalTime;
        // Convert duration to a more readable format, e.g., hours and minutes
        var durationInMinutes = Math.round(durationInSeconds / 60);
        var distanceInKilometers = (summary.totalDistance / 1000).toFixed(2); // Convert distance to kilometers

         // Update UI
         document.getElementById('route-duration').textContent = `Duration: ${durationInMinutes} minutes`;
         document.getElementById('route-distance').textContent = `Distance: ${distanceInKilometers} km`;
    });
}

async function fetchUnsplashPhoto(query) {
    const accessKey = 'your_unsplash_access_key';
    // Constructs the API endpoint
    const url = `https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(query)}&client_id=${accessKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            // First image result
            return data.results[0].urls.regular;
        } else {
            console.log('No results found for:', query);
            return null; // No photos are found
        }
    } catch (error) {
        console.error('Error fetching photo from Unsplash:', error);
        return null; // Handle fetch error
    }
}

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.display_name; // Return the full address as a string
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null; // Return null in case of error
    }
}

function on() {
    document.getElementById("overlay").classList.add("open");
}

function off() {
    document.getElementById("overlay").classList.remove("open");
}

/// Live location ///

// Location marker
var trackingIcon = L.icon({
    iconUrl: 'images/tracking.png',
    iconSize: [38, 38], // Size of the icon
    iconAnchor: [19, 38], // Adjusted to center the icon's bottom to the marker's location
});

function onLocationFound(e) {
    var radius = e.accuracy / 2;

    // Remove the existing marker and circle if any
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
        accuracyCircle = null;
    }

    // Create a new marker and circle
    userMarker = L.marker(e.latlng, {icon: trackingIcon}).addTo(map)
        .bindPopup("Your current location", {offset: L.point(0, -20)}).openPopup(); // Adjust the Y offset as needed
    accuracyCircle = L.circle(e.latlng, radius).addTo(map); // Keep a reference to the circle

}

function onLocationError(e) {
    alert(e.message);
}

function startTracking() {
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    map.locate({setView: true, maxZoom: 16, watch: true, enableHighAccuracy: true});
}

function stopTracking() {
    map.stopLocate(); // Stop tracking the user's position
    map.off('locationfound', onLocationFound);
    map.off('locationerror', onLocationError);

    // Remove the marker and circle from the map
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle); // Remove the circle from the map
        accuracyCircle = null;
    }
}

function toggleTracking() {
    isTracking = !isTracking; // Toggle the tracking state

    var btn = document.getElementById('tracking-btn').children[0]; // Get the button element

    if (isTracking) {
        startTracking();
        btn.textContent = 'Stop Tracking'; // Update button text
    } else {
        stopTracking();
        btn.textContent = 'Start Tracking'; // Update button text
    }
}