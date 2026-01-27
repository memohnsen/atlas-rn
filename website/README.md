# Workout Program Scraper & Viewer

This project scrapes Olympic weightlifting program data from a Google Sheet and displays it in a Next.js web interface. You can scrape sheets directly from the web interface or use the command-line scraper.

## Features

- **Web-based scraping**: Enter a Google Sheets URL and scrape directly from the browser
- **Interactive program viewer**: View workouts organized by week, day, and exercise
- **Week navigation**: Switch between weeks using tabs
- **Exercise ordering**: Exercises are properly ordered within each day using `exercise_number`

## Setup

### Prerequisites

- Node.js (v18 or later)
- Python 3.x
- A Google Sheet with the workout program (must be publicly accessible or shared)

### Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Set up Python virtual environment (if not already done):
```bash
cd sheet-scraper
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Start the Next.js development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Web Interface (Recommended)

1. Open the website at `http://localhost:3000`
2. Enter your Google Sheets URL in the input field (e.g., `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`)
3. **Enter the exact tab name** (required, case-sensitive). Check the bottom tabs in your Google Sheet to get the exact name (e.g., "4-Day Template", "3-Day Template", etc.)
4. Click "Scrape Sheet"
5. The program will be displayed below, organized by week and day

**Important**: The tab name must match exactly, including capitalization and spacing. The scraper will fail if the tab name doesn't match.

### Command Line

You can also run the scraper from the command line:

```bash
cd sheet-scraper
source venv/bin/activate
python scraper.py
```

Or use the API version:

```bash
cd sheet-scraper
source venv/bin/activate
python scraper_api.py <SHEET_ID> [TAB_NAME]
```

This will create `workout_program.csv` in the `sheet-scraper` directory.

## Project Structure

```
programming-scraper/
├── app/
│   ├── api/
│   │   ├── scrape/
│   │   │   └── route.js          # API endpoint for scraping sheets
│   │   └── workout-data/
│   │       └── route.js           # API endpoint for serving CSV data
│   ├── layout.js                  # Next.js root layout
│   └── page.js                    # Main page with scraping interface
├── sheet-scraper/
│   ├── scraper.py                 # Main command-line scraper
│   ├── scraper_api.py             # API-compatible scraper
│   ├── workout_program.csv        # Generated CSV file
│   ├── requirements.txt           # Python dependencies
│   └── venv/                      # Python virtual environment
├── next.config.js                 # Next.js configuration
└── package.json                   # Node.js dependencies
```

## CSV Format

The generated CSV contains the following columns:

- `id` - Unique identifier for each set
- `user_id` - User ID (default: 1)
- `program_name` - Name of the program (e.g., "4-Day Template")
- `week_number` - Week number (1-12)
- `day_number` - Day number within the week (1-4)
- `exercise_number` - Order of exercise within the day (1, 2, 3, etc.)
- `exercise_name` - Name of the exercise (e.g., "Snatch", "Clean", "Back Squat")
- `sets` - Number of sets (typically 1 per record)
- `reps` - Number of repetitions
- `weights` - Weight in kg
- `notes` - Additional notes (e.g., intensity percentage)

## Google Sheets Format

The scraper expects Google Sheets with the following structure:

- **Columns A-G**: Metadata (Date, Notes, Program, Primary Focus, Program Week, etc.)
- **Column H onwards**: Program data organized horizontally
- **Row 0**: Exercise names (Snatch, Clean, Jerk, etc.)
- **Row 1**: Exercise weights (1RM values)
- **Row 3**: Week labels ("Week 1", "Week 2", etc.)
- **Row 4**: Day labels ("Day 1", "Day 2", etc.)
- **Row 5+**: Exercise data with sets, reps, and weights

Each week is organized as a horizontal block of columns, with exercises listed vertically within each day.

## API Endpoints

### POST `/api/scrape`

Scrapes a Google Sheet and returns the parsed data.

**Request Body:**
```json
{
  "url": "https://docs.google.com/spreadsheets/d/SHEET_ID/edit",
  "tabName": "4-Day Template"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 975
}
```

### GET `/api/workout-data`

Returns the workout data from the CSV file (if it exists).

**Response:**
```json
[...]
```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Notes

- The Google Sheet must be publicly accessible or shared with appropriate permissions
- The scraper automatically extracts the sheet ID from the full Google Sheets URL
- Exercises are automatically ordered within each day based on their appearance in the sheet
- The web interface will display an error message if scraping fails
