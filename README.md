# CommonGround Web Application

## Project Overview
**CommonGround** is a web application designed to help users find convenient meeting locations that accommodate the various travel preferences and interests of multiple users. This service simplifies the process of selecting meeting spots by providing suggestions based on the geographical starting locations of the users and highlighting nearby amenities and attractions.

## Features
- **Input Addresses**: Users can enter two or more addresses to find interesting locations in between.
- **Map Options**: Displays the distance between locations and routes from point A to point B.
- **Restaurant Selection**: Choose a restaurant from the suggested options.
- **Geographic Midpoint Calculation**: Calculates a convenient meeting spot based on user locations.
- **Amenities and Points of Interest**: Suggests nearby amenities like restaurants, cafes, parks, and cinemas.
- **Live Location Tracking**: Real-time tracking of user locations.

## Installation

### Prerequisites
- Internet connection for API calls (Nominatim, Overpass API, Unsplash).
- A code editor that has a live extension such as Visual Studio Code, alternatively web servers (e.g., Apache, Nginx) or a local server setup using tools like XAMPP or WAMP.

### Steps

1. Clone the repository:
```bash
git clone https://github.com/DefineUser/commonground.git
```

2. Navigate to the project directory:
```bash
cd commonground
```

3. Install the Live Server extension for Visual Studio Code (optional):
- Go to the Extensions view by clicking on the Extensions icon in the Sidebar.
- Search for "Live Server" by Ritwick Dey.
- Click "Install".

4. Start the Live Server:

- Open the index.html file.
- Right-click on the file and select "Open with Live Server".
- Your default web browser should open and navigate to http://127.0.0.1:5500/index.html.

## Setting Up Environment Variables
Some APIs (like Unsplash) require API keys. These keys should be stored in a .env file at the root of your project (or you can directly replace them in the JavaScript code if you're not using a Node.js environment).

In the interest-points.js file, replace your_unsplash_access_key with your actual API key.

```bash
const accessKey = 'your_unsplash_access_key';
```

## Technologies Used
- Frontend: HTML, CSS, JavaScript, Bootstrap
- APIs: OpenStreetMap (for mapping and location services), Unsplash API (for images)
- Geolocation: HTML5 Geolocation API for real-time tracking

## Development Process
- Agile Methodology: Utilized to ensure flexibility and iterative progress.
- Prototyping: High-fidelity prototypes guided the frontend design and development.
- Gantt Chart: Used to track project progression and manage timelines.

## License
This project is licensed under the MIT License. See the LICENSE file for details.