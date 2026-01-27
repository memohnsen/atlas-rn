#!/usr/bin/env python3
"""
Google Sheets Scraper API - Can be called with sheet ID and tab name as arguments
"""

import sys
import json
import requests
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import re

# Import functions from the main scraper
# We'll copy the necessary functions here or import them

def get_sheet_data(sheet_id: str, sheet_name: str = None) -> pd.DataFrame:
    """Fetch Google Sheet data using the CSV export URL"""
    urls_to_try = []
    
    if sheet_name:
        urls_to_try.append(f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}")
    else:
        urls_to_try.append(f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv")
        urls_to_try.append(f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv")
    
    errors = []
    for url in urls_to_try:
        try:
            response = requests.get(url, timeout=10)
            
            # Check for specific HTTP errors
            if response.status_code == 403:
                raise Exception(f"Access denied (403 Forbidden). The sheet may not be publicly viewable. Please make sure the Google Sheet is shared with 'Anyone with the link' can view, or check if the tab name '{sheet_name}' is correct.")
            elif response.status_code == 404:
                raise Exception(f"Sheet or tab not found (404). Please verify:\n1. The sheet ID is correct\n2. The tab name '{sheet_name}' exists and matches exactly (case-sensitive)")
            elif response.status_code == 400:
                raise Exception(f"Bad request (400). The tab name '{sheet_name}' may not exist. Please check the exact tab name in your Google Sheet.")
            
            response.raise_for_status()
            
            from io import StringIO
            df = pd.read_csv(StringIO(response.text))
            return df
        except requests.exceptions.HTTPError as e:
            # response should be available from the exception
            status_code = getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
            if status_code == 403:
                error_msg = f"Access denied (403). The sheet is not publicly viewable. Please share the sheet with 'Anyone with the link' can view."
            elif status_code == 404:
                error_msg = f"Not found (404). Sheet ID or tab name '{sheet_name}' may be incorrect."
            else:
                error_msg = f"HTTP {status_code or 'unknown'}: {str(e)}"
            errors.append(error_msg)
            continue
        except Exception as e:
            error_str = str(e)
            # If it's already a detailed error message, use it
            if 'Access denied' in error_str or 'not found' in error_str or 'Bad request' in error_str:
                errors.append(error_str)
            else:
                errors.append(f"Error accessing {url}: {error_str}")
            continue
    
    # Provide detailed error message
    if any("403" in str(e) or "Access denied" in str(e) for e in errors):
        error_summary = "Access denied (403). The sheet is not publicly accessible. Please make sure the Google Sheet is shared with 'Anyone with the link' can view."
        if sheet_name:
            error_summary += f" Also verify the tab name '{sheet_name}' exists and matches exactly (case-sensitive)."
    elif any("404" in str(e) or "Not found" in str(e) for e in errors):
        error_summary = f"Sheet or tab not found (404). Please verify: 1) The sheet ID is correct, 2) The tab name '{sheet_name}' exists and matches exactly (case-sensitive)."
    elif any("400" in str(e) or "Bad request" in str(e) for e in errors):
        error_summary = f"Bad request (400). The tab name '{sheet_name}' may not exist. Please check the exact tab name in your Google Sheet (case-sensitive)."
    else:
        error_summary = "Failed to fetch sheet data. Possible issues: 1) Sheet is not publicly accessible, 2) Tab name is incorrect, 3) Network connectivity issues."
        if errors:
            # Get the first meaningful error
            first_error = errors[0] if errors else "Unknown error"
            error_summary += f" Details: {first_error}"
    
    raise Exception(error_summary)

def find_week_blocks(df: pd.DataFrame) -> List[Tuple[int, int, int]]:
    """Find week blocks in the horizontal structure."""
    week_blocks = []
    
    if len(df) < 5:
        return week_blocks
    
    week_row = df.iloc[3]
    
    current_week = None
    start_col = None
    
    for col_idx in range(7, len(df.columns)):
        col_name = df.columns[col_idx]
        cell_value = week_row[col_name] if col_name in week_row.index else None
        
        if pd.notna(cell_value):
            cell_str = str(cell_value).strip()
            week_match = re.search(r'[Ww]eek\s+(\d+)', cell_str)
            if week_match:
                if current_week is not None and start_col is not None:
                    week_blocks.append((current_week, start_col, col_idx - 1))
                
                current_week = int(week_match.group(1))
                start_col = col_idx
    
    if current_week is not None and start_col is not None:
        end_col = len(df.columns) - 1
        for i in range(start_col + 1, len(df.columns)):
            next_cell = week_row[df.columns[i]] if i < len(df.columns) else None
            if pd.notna(next_cell):
                next_str = str(next_cell).strip()
                if re.search(r'[Ww]eek\s+\d+', next_str):
                    end_col = i - 1
                    break
        week_blocks.append((current_week, start_col, end_col))
    
    return week_blocks

def extract_exercise_weights(df: pd.DataFrame) -> Dict[str, float]:
    """Extract exercise weights from row 1, columns 0-5."""
    weights = {}
    if len(df) < 2:
        return weights
    
    weight_row = df.iloc[1]
    exercise_mapping = {
        0: 'Snatch',
        1: 'Clean',
        2: 'Jerk',
        3: 'Clean and Jerk',
        4: 'Back Squat',
        5: 'Front Squat'
    }
    
    for col_idx in range(min(6, len(df.columns))):
        if col_idx in exercise_mapping:
            col_name = df.columns[col_idx]
            weight_val = weight_row[col_name] if col_name in weight_row.index else None
            if pd.notna(weight_val):
                try:
                    weight = float(weight_val)
                    exercise_name = exercise_mapping[col_idx]
                    weights[exercise_name] = weight
                except (ValueError, TypeError):
                    pass
    
    return weights

def parse_exercise_sets(df: pd.DataFrame, row_idx: int, start_col: int, end_col: int,
                       exercise_name: str, week_num: int, day_num: int,
                       program_name: str,
                       exercise_number: int, athlete_name: str = '', start_date: str = '') -> List[Dict[str, Any]]:
    """Parse sets for an exercise."""
    exercises = []
    
    if row_idx + 2 >= len(df):
        return exercises
    
    reps_row = df.iloc[row_idx]
    weights_row = df.iloc[row_idx + 1]
    percentages_row = df.iloc[row_idx + 2] if row_idx + 2 < len(df) else None
    
    sets_data = []
    
    for col_idx in range(start_col + 1, min(end_col + 1, len(df.columns))):
        col_name = df.columns[col_idx]
        
        rep_val = reps_row[col_name] if col_name in reps_row.index else None
        if pd.isna(rep_val):
            continue
        
        try:
            reps = int(float(rep_val))
            if reps <= 0 or reps > 50:
                continue
        except (ValueError, TypeError):
            continue
        
        weight_val = weights_row[col_name] if col_name in weights_row.index else None
        weight = None
        if pd.notna(weight_val):
            try:
                weight = float(weight_val)
            except (ValueError, TypeError):
                pass
        
        percentage = None
        if percentages_row is not None:
            pct_val = percentages_row[col_name] if col_name in percentages_row.index else None
            if pd.notna(pct_val):
                pct_str = str(pct_val).strip().replace('%', '')
                try:
                    percentage = float(pct_str)
                except (ValueError, TypeError):
                    pass
        
        if weight is not None:
            if weight > 500:
                continue
            sets_data.append({
                'reps': reps,
                'weight': weight,
                'percentage': percentage
            })
    
    for set_num, set_data in enumerate(sets_data, 1):
        exercise_record = {
            'user_id': '1',
            'athlete_name': athlete_name,
            'program_name': program_name,
            'start_date': start_date,
            'week_number': week_num,  # Keep as number
            'day_number': day_num,  # Keep as number
            'exercise_number': exercise_number,  # Keep as number
            'exercise_name': exercise_name,
            'sets': 1,  # Keep as number
            'reps': str(set_data['reps']),  # Convert to string
            'weights': set_data['weight'],  # Keep as number (float)
            'percent': set_data['percentage'],  # Keep as number (float)
            'completed': False  # Default to not completed
        }
        exercises.append(exercise_record)
    
    return exercises

def parse_accessories(df: pd.DataFrame, row_idx: int, start_col: int, end_col: int,
                     week_num: int, day_num: int, program_name: str,
                     exercise_number: int,
                     seen_exercises: Dict[str, int], athlete_name: str = '', start_date: str = '') -> List[Dict[str, Any]]:
    """
    Parse accessories from a row. Format: "Accessories 2 x 10-15:\nExercise1\nExercise2"
    Returns list of accessory exercise records.
    """
    accessories = []
    
    if row_idx >= len(df):
        return accessories
    
    row = df.iloc[row_idx]
    first_col_name = df.columns[start_col] if start_col < len(df.columns) else None
    
    if not first_col_name:
        return accessories
    
    first_cell = row[first_col_name] if first_col_name in row.index else None
    
    if pd.isna(first_cell):
        return accessories
    
    cell_str = str(first_cell).strip()
    
    # Parse sets and reps from "Accessories 2 x 10-15:" format
    sets_match = re.search(r'Accessories\s+(\d+)\s*[xX×]\s*(\d+)\s*[-–]\s*(\d+)', cell_str, re.IGNORECASE)
    if not sets_match:
        # Try alternative format
        sets_match = re.search(r'(\d+)\s*[xX×]\s*(\d+)\s*[-–]\s*(\d+)', cell_str)
    
    sets = None
    reps_min = None
    reps_max = None
    
    if sets_match:
        sets = int(sets_match.group(1))
        reps_min = int(sets_match.group(2))
        reps_max = int(sets_match.group(3))
    else:
        # Default if pattern not found
        sets = 2
        reps_min = 10
        reps_max = 15
    
    # Extract exercise names - they might be in the same cell (newline separated) or in following rows
    exercise_names = []
    
    # First, check if exercise names are in the same cell (after the accessories line)
    if '\n' in cell_str:
        lines = cell_str.split('\n')
        for line in lines[1:]:  # Skip first line (Accessories line)
            line = line.strip()
            if line and line not in ['Accessories', 'Athlete Comments:']:
                # Clean up the exercise name
                exercise_name = line.strip()
                if exercise_name:
                    exercise_names.append(exercise_name)
    
    # Also check following rows for exercise names
    for i in range(1, 5):  # Check up to 4 rows below
        if row_idx + i >= len(df):
            break
        
        next_row = df.iloc[row_idx + i]
        next_cell = next_row[first_col_name] if first_col_name in next_row.index else None
        
        if pd.notna(next_cell):
            next_str = str(next_cell).strip()
            
            # Stop if we hit another section (Day, exercise, etc.)
            if re.search(r'[Dd]ay\s+\d+', next_str):
                break
            if any(keyword in next_str for keyword in ['Snatch', 'Clean', 'Jerk', 'Squat', 'Total', 'Accessories']):
                break
            if 'Athlete Comments' in next_str:
                break
            
            # If it's not empty and doesn't look like a number or percentage, it might be an exercise name
            if next_str and not re.match(r'^\d+\.?\d*%?$', next_str) and len(next_str) > 2:
                # Check if it looks like an exercise name (not a number, not a percentage)
                if not re.match(r'^\d+$', next_str) and '%' not in next_str:
                    exercise_names.append(next_str)
    
    # Create records for each accessory exercise
    for exercise_name in exercise_names:
        if exercise_name not in seen_exercises:
            exercise_number += 1
            seen_exercises[exercise_name] = exercise_number
        
        current_exercise_number = seen_exercises[exercise_name]

        # Create one record per accessory exercise with sets and rep range
        accessory_record = {
            'user_id': '1',
            'athlete_name': athlete_name,
            'program_name': program_name,
            'start_date': start_date,
            'week_number': week_num,  # Keep as number
            'day_number': day_num,  # Keep as number
            'exercise_number': current_exercise_number,  # Keep as number
            'exercise_name': exercise_name,
            'sets': sets,  # Keep as number (e.g., 2)
            'reps': f'{reps_min}-{reps_max}',  # Rep range as string (e.g., "10-15")
            'weights': None,  # Accessories typically don't have weights (null)
            'percent': None,  # Accessories typically don't have percentages (null)
            'completed': False  # Default to not completed
        }
        accessories.append(accessory_record)
    
    return accessories

def find_day_blocks(df: pd.DataFrame, start_row: int, end_row: int, 
                   start_col: int, end_col: int) -> List[Tuple[int, int]]:
    """Find day blocks within a week block."""
    day_blocks = []
    
    found_day_1 = False
    first_day_row = start_row
    
    for row_idx in range(start_row, min(end_row, len(df))):
        row = df.iloc[row_idx]
        first_col_name = df.columns[start_col] if start_col < len(df.columns) else None
        
        if first_col_name:
            cell_value = row[first_col_name] if first_col_name in row.index else None
            if pd.notna(cell_value):
                cell_str = str(cell_value).strip()
                day_match = re.search(r'[Dd]ay\s+(\d+)', cell_str)
                if day_match:
                    day_num = int(day_match.group(1))
                    if day_num == 1:
                        found_day_1 = True
                        first_day_row = row_idx
                    day_blocks.append((day_num, row_idx))
    
    if not found_day_1 and day_blocks:
        day_blocks.insert(0, (1, start_row))
    elif not day_blocks:
        day_blocks = [(1, start_row)]
    
    return day_blocks

def parse_week_data(df: pd.DataFrame, week_num: int, start_col: int, end_col: int,
                    program_name: str, exercise_weights: Dict[str, float],
                    athlete_name: str = '', start_date: str = '') -> List[Dict[str, Any]]:
    """Parse data for a specific week block."""
    all_exercises = []
    
    if len(df) < 5:
        return all_exercises
    
    start_row = 5
    end_row = len(df)
    
    day_blocks = find_day_blocks(df, start_row, end_row, start_col, end_col)
    
    if not day_blocks:
        day_blocks = [(1, start_row)]
    
    for day_idx, (day_num, day_start_row) in enumerate(day_blocks):
        if day_idx + 1 < len(day_blocks):
            day_end_row = day_blocks[day_idx + 1][1]
        else:
            day_end_row = end_row
        
        current_exercise = None
        exercise_number = 0
        seen_exercises = {}
        
        for row_idx in range(day_start_row, day_end_row):
            row = df.iloc[row_idx]
            
            first_col_name = df.columns[start_col] if start_col < len(df.columns) else None
            if not first_col_name:
                continue
            
            first_cell = row[first_col_name] if first_col_name in row.index else None
            
            if pd.notna(first_cell):
                first_cell_str = str(first_cell).strip()
                
                if re.search(r'[Dd]ay\s+\d+', first_cell_str):
                    continue
                if 'Athlete Comments' in first_cell_str:
                    continue
                
                # Parse accessories if found
                if 'Accessories' in first_cell_str:
                    accessories = parse_accessories(df, row_idx, start_col, end_col, week_num, day_num,
                                                   program_name, exercise_number, seen_exercises, athlete_name, start_date)
                    if accessories:
                        all_exercises.extend(accessories)
                        # Update exercise_number to the max value after parsing accessories
                        if seen_exercises:
                            exercise_number = max(seen_exercises.values())
                    continue
                if 'Rate Your Readiness' in first_cell_str:
                    continue
                if 'Split Squats' in first_cell_str or 'Leaps' in first_cell_str:
                    continue
                if 'Total' in first_cell_str or first_cell_str in ['Total Reps', 'Total Tonnage', 'Relative Intensity']:
                    continue
                
                exercise_keywords = ['Snatch', 'Clean', 'Jerk', 'Squat', 'Pull', 'Press', 'Push', 'Curl']
                is_exercise = any(keyword.lower() in first_cell_str.lower() for keyword in exercise_keywords)
                
                if is_exercise:
                    if row_idx + 1 < len(df):
                        next_row = df.iloc[row_idx + 1]
                        next_first_cell = next_row[first_col_name] if first_col_name in next_row.index else None
                        
                        if pd.isna(next_first_cell) or str(next_first_cell).strip() == '':
                            has_numbers = False
                            for col_idx in range(start_col + 1, min(end_col + 1, len(df.columns))):
                                col_name = df.columns[col_idx]
                                val = row[col_name] if col_name in row.index else None
                                if pd.notna(val):
                                    try:
                                        int(float(val))
                                        has_numbers = True
                                        break
                                    except (ValueError, TypeError):
                                        pass
                            
                            if has_numbers:
                                exercise_name = first_cell_str
                                if 'Clean & Jerk' in exercise_name or 'Clean and Jerk' in exercise_name:
                                    exercise_name = 'Clean and Jerk'
                                elif 'Snatch Pull' in exercise_name:
                                    exercise_name = 'Snatch Pull'
                                elif 'Clean Pull' in exercise_name:
                                    exercise_name = 'Clean Pull'
                                elif 'Front Squat' in exercise_name or 'FS' in exercise_name:
                                    exercise_name = 'Front Squat'
                                elif 'Back Squat' in exercise_name or 'BS' in exercise_name:
                                    exercise_name = 'Back Squat'
                                
                                if exercise_name not in seen_exercises:
                                    exercise_number += 1
                                    seen_exercises[exercise_name] = exercise_number
                                current_exercise_number = seen_exercises[exercise_name]

                                exercises = parse_exercise_sets(df, row_idx, start_col, end_col,
                                                               exercise_name, week_num, day_num,
                                                               program_name,
                                                               current_exercise_number, athlete_name, start_date)
                                all_exercises.extend(exercises)
    
    return all_exercises

def parse_template_sheet(df: pd.DataFrame, program_name: str, athlete_name: str = '', start_date: str = '') -> List[Dict[str, Any]]:
    """Parse a program template sheet that's structured horizontally."""
    all_exercises = []

    week_blocks = find_week_blocks(df)

    if not week_blocks:
        return all_exercises

    exercise_weights = extract_exercise_weights(df)

    for week_num, start_col, end_col in week_blocks:
        week_exercises = parse_week_data(df, week_num, start_col, end_col,
                                        program_name, exercise_weights, athlete_name, start_date)
        all_exercises.extend(week_exercises)

    return all_exercises

def scrape_sheet(sheet_id: str, tab_name: str = '4-Day Template', athlete_name: str = '', start_date: str = ''):
    """Main function to scrape a sheet and return exercises"""
    all_exercises = []

    try:
        df = get_sheet_data(sheet_id, sheet_name=tab_name)
        exercises = parse_template_sheet(df, tab_name, athlete_name, start_date)
        all_exercises.extend(exercises)
        return all_exercises
    except Exception as e:
        raise Exception(f"Error processing {tab_name}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scraper_api.py <sheet_id> [tab_name] [athlete_name] [start_date]")
        sys.exit(1)

    sheet_id = sys.argv[1]
    tab_name = sys.argv[2] if len(sys.argv) > 2 else '4-Day Template'
    athlete_name = sys.argv[3].lower().strip() if len(sys.argv) > 3 and sys.argv[3].strip() else ''
    start_date = sys.argv[4].strip() if len(sys.argv) > 4 and sys.argv[4].strip() else ''

    try:
        exercises = scrape_sheet(sheet_id, tab_name, athlete_name, start_date)

        # Output as JSON to stdout
        print(json.dumps(exercises, ensure_ascii=False))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

