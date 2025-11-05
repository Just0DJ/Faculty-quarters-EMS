# College Electricity Billing Dashboard System

A modern, minimal web application for managing electricity billing for college faculty buildings.

## Features

### Admin Features
- Upload Excel/CSV of meter readings
- Auto-extract, clean, and display structured data
- View all flats' bills
- View dashboards and analytical charts (daily/monthly/yearly)
- Export data as CSV/PDF

### Faculty Features
- Secure login
- View only their own unit and bill data
- Charts: usage trend, previous bill comparison
- Download their bill

## Data Engineering Pipeline
1. Data Collection (Excel/CSV upload)
2. Data Cleaning & Validation
3. Data Transformation & Unit/Bill Calculation
4. Data Storage (local storage)
5. Data Analytics (summary, trends, comparisons)
6. Visualization (charts, usage graphs)
7. Reporting & Export (CSV/PDF)

## Setup Instructions

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- No server required (runs entirely in the browser)

### Installation
1. Download or clone this repository
2. Open `index.html` in your web browser

### Login Credentials

#### Admin
- Username: admin
- Password: admin123

#### Faculty
- Username: faculty1
- Password: faculty123
- (Dr. Sharma, Floor 1, Flat 101)

- Username: faculty2
- Password: faculty123
- (Dr. Patel, Floor 2, Flat 201)

## Usage

### Admin
1. Login with admin credentials
2. Navigate to "Upload Data" to upload meter readings (use sample_data.csv for testing)
3. Process the data and save it
4. View dashboards, bills, and analytics
5. Export data as needed

### Faculty
1. Login with faculty credentials
2. View your dashboard with current bill and usage trends
3. Navigate to "Bills" to view and download your bills
4. Check "Analytics" for detailed usage charts

## Technologies Used
- HTML5
- CSS3 (with CSS Variables for theming)
- JavaScript (Vanilla)
- Chart.js for data visualization
- SheetJS for Excel parsing
- jsPDF for PDF generation

## License
This project is licensed under the MIT License.