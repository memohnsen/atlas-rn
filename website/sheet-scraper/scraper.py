#!/usr/bin/env python3
"""
Google Sheets Scraper for Olympic Weightlifting Program
Scrapes the Google Sheet and converts it to a structured CSV format
"""

import csv
import requests
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import re

# Google Sheet ID from the URL
SHEET_ID = "1bqXWfTBPVPH-aVJzVA4ozob6RtnAAnlEIZsvMaCrToE"

def get_sheet_data(sheet_id: str, sheet_name: str = None) -> pd.DataFrame:
    """
    Fetch Google Sheet data using the CSV export URL
    """
    urls_to_try = []
    
    if sheet_name:
        urls_to_try.append(f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}")
    else:
        urls_to_try.append(f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv")
        urls_to_try.append(f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv")
    
    for url in urls_to_try:
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            from io import StringIO
            df = pd.read_csv(StringIO(response.text))
            return df
        except Exception as e:
            continue
    
    raise Exception("Failed to fetch sheet data with all attempted URLs")

def find_week_blocks(df: pd.DataFrame) -> List[Tuple[int, int, int]]:
    """
    Find week blocks in the horizontal structure.
    Returns list of (week_num, start_col_idx, end_col_idx) tuples.
    """
    week_blocks = []
    
    if len(df) < 5:
        return week_blocks
    
    # Check row 3 (index 3) for week numbers
    week_row = df.iloc[3]
    
    current_week = None
    start_col = None
    
    for col_idx in range(7, len(df.columns)):  # Start from column H (index 7)
        col_name = df.columns[col_idx]
        cell_value = week_row[col_name] if col_name in week_row.index else None
        
        if pd.notna(cell_value):
            cell_str = str(cell_value).strip()
            week_match = re.search(r'[Ww]eek\s+(\d+)', cell_str)
            if week_match:
                # Save previous week block if exists
                if current_week is not None and start_col is not None:
                    week_blocks.append((current_week, start_col, col_idx - 1))
                
                current_week = int(week_match.group(1))
                start_col = col_idx
    
    # Add the last week block
    if current_week is not None and start_col is not None:
        # Find the next week start or end of columns
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
    """
    Extract exercise weights from row 1, columns 0-5.
    These are the 1RM or reference weights.
    """
    weights = {}
    if len(df) < 2:
        return weights
    
    weight_row = df.iloc[1]
    
    # Standard exercise mapping
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
                       program_name: str, exercise_id_counter: List[int],
                       exercise_number: int) -> List[Dict[str, Any]]:
    """
    Parse sets for an exercise. The structure is:
    - Row with exercise name: reps for each set
    - Next row: weights for each set
    - Next row: percentages for each set
    """
    exercises = []
    
    if row_idx + 2 >= len(df):
        return exercises
    
    # Get reps row (current row)
    reps_row = df.iloc[row_idx]
    # Get weights row (next row)
    weights_row = df.iloc[row_idx + 1]
    # Get percentages row (row after that, if available)
    percentages_row = df.iloc[row_idx + 2] if row_idx + 2 < len(df) else None
    
    # Extract reps, weights, and percentages from the week block columns
    sets_data = []
    
    for col_idx in range(start_col + 1, min(end_col + 1, len(df.columns))):
        col_name = df.columns[col_idx]
        
        # Get rep count
        rep_val = reps_row[col_name] if col_name in reps_row.index else None
        if pd.isna(rep_val):
            continue
        
        try:
            reps = int(float(rep_val))
            if reps <= 0 or reps > 50:  # Filter out invalid reps
                continue
        except (ValueError, TypeError):
            continue
        
        # Get weight
        weight_val = weights_row[col_name] if col_name in weights_row.index else None
        weight = None
        if pd.notna(weight_val):
            try:
                weight = float(weight_val)
            except (ValueError, TypeError):
                pass
        
        # Get percentage (optional)
        percentage = None
        if percentages_row is not None:
            pct_val = percentages_row[col_name] if col_name in percentages_row.index else None
            if pd.notna(pct_val):
                pct_str = str(pct_val).strip().replace('%', '')
                try:
                    percentage = float(pct_str)
                except (ValueError, TypeError):
                    pass
        
        # Filter out totals and invalid data
        # Totals typically have very high weights (>500kg) 
        # Also check if the row contains "Total" text
        if weight is not None:
            # Skip if it looks like a total (very high weight)
            # Most weightlifting sets are under 500kg total weight
            if weight > 500:
                continue
            sets_data.append({
                'reps': reps,
                'weight': weight,
                'percentage': percentage
            })
    
    # Create exercise records for each set
    for set_num, set_data in enumerate(sets_data, 1):
        exercise_id_counter[0] += 1
        notes = []
        if set_data['percentage'] is not None:
            notes.append(f"{set_data['percentage']:.0f}%")
        
        exercise_record = {
            'id': exercise_id_counter[0],
            'user_id': 1,
            'program_name': program_name,
            'week_number': week_num,
            'day_number': day_num,
            'exercise_number': exercise_number,
            'exercise_name': exercise_name,
            'sets': 1,
            'reps': set_data['reps'],
            'weights': set_data['weight'],
            'notes': ', '.join(notes) if notes else ''
        }
        exercises.append(exercise_record)
    
    return exercises

def parse_accessories(df: pd.DataFrame, row_idx: int, start_col: int, end_col: int,
                     week_num: int, day_num: int, program_name: str,
                     exercise_id_counter: List[int], exercise_number: int,
                     seen_exercises: Dict[str, int]) -> List[Dict[str, Any]]:
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
                if not re.match(r'^\d+$', next_str) and '%' not in next_str:
                    exercise_names.append(next_str)
    
    # Create records for each accessory exercise
    for exercise_name in exercise_names:
        if exercise_name not in seen_exercises:
            exercise_number += 1
            seen_exercises[exercise_name] = exercise_number
        
        current_exercise_number = seen_exercises[exercise_name]
        
        # Create one record per accessory exercise with sets and rep range
        exercise_id_counter[0] += 1
        accessory_record = {
            'id': exercise_id_counter[0],
            'user_id': 1,
            'program_name': program_name,
            'week_number': week_num,
            'day_number': day_num,
            'exercise_number': current_exercise_number,
            'exercise_name': exercise_name,
            'sets': sets,  # Number of sets (e.g., 2)
            'reps': f'{reps_min}-{reps_max}',  # Rep range (e.g., "10-15")
            'weights': None,  # Accessories typically don't have weights
            'notes': ''  # No additional notes needed
        }
        accessories.append(accessory_record)
    
    return accessories

def find_day_blocks(df: pd.DataFrame, start_row: int, end_row: int, 
                   start_col: int, end_col: int) -> List[Tuple[int, int]]:
    """
    Find day blocks within a week block.
    Returns list of (day_num, row_idx) tuples.
    Day 1 might not have an explicit marker, so we need to handle that.
    """
    day_blocks = []
    
    # First, check if there's a "Day 1" marker
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
    
    # If no Day 1 marker found, but we found other days, Day 1 starts at start_row
    if not found_day_1 and day_blocks:
        # Insert Day 1 at the beginning
        day_blocks.insert(0, (1, start_row))
    elif not day_blocks:
        # No day markers at all, treat entire week as day 1
        day_blocks = [(1, start_row)]
    
    return day_blocks

def parse_week_data(df: pd.DataFrame, week_num: int, start_col: int, end_col: int,
                    program_name: str, exercise_weights: Dict[str, float],
                    exercise_id_counter: List[int]) -> List[Dict[str, Any]]:
    """
    Parse data for a specific week block.
    """
    all_exercises = []
    
    if len(df) < 5:
        return all_exercises
    
    # Find where the week data starts (after row 4)
    start_row = 5
    end_row = len(df)
    
    # Find day blocks
    day_blocks = find_day_blocks(df, start_row, end_row, start_col, end_col)
    
    if not day_blocks:
        # If no explicit day markers, treat entire week as day 1
        day_blocks = [(1, start_row)]
    
    # Process each day
    for day_idx, (day_num, day_start_row) in enumerate(day_blocks):
        # Determine end row for this day (start of next day or end of week)
        if day_idx + 1 < len(day_blocks):
            day_end_row = day_blocks[day_idx + 1][1]
        else:
            day_end_row = end_row
        
        # Parse exercises in this day
        current_exercise = None
        exercise_number = 0  # Track exercise order within the day
        seen_exercises = {}  # Track which exercises we've seen to assign numbers
        
        for row_idx in range(day_start_row, day_end_row):
            row = df.iloc[row_idx]
            
            # Check first column of week block for exercise name
            first_col_name = df.columns[start_col] if start_col < len(df.columns) else None
            if not first_col_name:
                continue
            
            first_cell = row[first_col_name] if first_col_name in row.index else None
            
            if pd.notna(first_cell):
                first_cell_str = str(first_cell).strip()
                
                # Skip day markers and other non-exercise rows
                if re.search(r'[Dd]ay\s+\d+', first_cell_str):
                    continue
                if 'Athlete Comments' in first_cell_str:
                    continue
                
                # Parse accessories if found
                if 'Accessories' in first_cell_str:
                    accessories = parse_accessories(df, row_idx, start_col, end_col, week_num, day_num, 
                                                   program_name, exercise_id_counter, exercise_number, seen_exercises)
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
                
                # Check if this looks like an exercise name
                # Look for exercise names in the first cell
                exercise_keywords = ['Snatch', 'Clean', 'Jerk', 'Squat', 'Pull', 'Press', 'Push', 'Curl']
                is_exercise = any(keyword.lower() in first_cell_str.lower() for keyword in exercise_keywords)
                
                if is_exercise:
                    # Check if next row has numeric data (weights)
                    if row_idx + 1 < len(df):
                        next_row = df.iloc[row_idx + 1]
                        next_first_cell = next_row[first_col_name] if first_col_name in next_row.index else None
                        
                        # If next row's first cell is empty/NaN, it's likely the weights row
                        if pd.isna(next_first_cell) or str(next_first_cell).strip() == '':
                            # Check if there are numbers in the week block columns
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
                                # This is an exercise with sets data
                                exercise_name = first_cell_str
                                # Clean up exercise name
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
                                
                                # Assign exercise number (increment if it's a new exercise)
                                if exercise_name not in seen_exercises:
                                    exercise_number += 1
                                    seen_exercises[exercise_name] = exercise_number
                                current_exercise_number = seen_exercises[exercise_name]
                                
                                exercises = parse_exercise_sets(df, row_idx, start_col, end_col,
                                                               exercise_name, week_num, day_num,
                                                               program_name, exercise_id_counter,
                                                               current_exercise_number)
                                all_exercises.extend(exercises)
    
    return all_exercises

def parse_template_sheet(df: pd.DataFrame, program_name: str, exercise_id_counter: List[int]) -> List[Dict[str, Any]]:
    """
    Parse a program template sheet that's structured horizontally.
    """
    all_exercises = []
    
    # Find week blocks
    week_blocks = find_week_blocks(df)
    
    if not week_blocks:
        return all_exercises
    
    # Extract exercise weights (1RM values)
    exercise_weights = extract_exercise_weights(df)
    
    # Parse each week
    for week_num, start_col, end_col in week_blocks:
        week_exercises = parse_week_data(df, week_num, start_col, end_col,
                                        program_name, exercise_weights, exercise_id_counter)
        all_exercises.extend(week_exercises)
    
    return all_exercises

def save_exercises_to_csv(exercises: List[Dict[str, Any]], filename: str = 'workout_program.csv'):
    """
    Save exercise records to CSV file
    """
    if not exercises:
        print("No exercises to save!")
        return
    
    fieldnames = ['id', 'user_id', 'program_name', 'week_number', 'day_number', 
                  'exercise_number', 'exercise_name', 'sets', 'reps', 'weights', 'notes']
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for exercise in exercises:
            writer.writerow(exercise)
    
    print(f"\nSaved {len(exercises)} exercise records to '{filename}'")

def main():
    print("Fetching Google Sheet data...")
    
    # Only scrape the specific tab requested (4-Day Template, gid=1969058556)
    tab_name = '4-Day Template'
    
    all_exercises = []
    exercise_id_counter = [0]  # Use list to allow modification in nested functions
    
    try:
        print(f"\nProcessing tab: {tab_name}")
        df = get_sheet_data(SHEET_ID, sheet_name=tab_name)
        print(f"  Sheet shape: {df.shape}")
        
        exercises = parse_template_sheet(df, tab_name, exercise_id_counter)
        all_exercises.extend(exercises)
        print(f"  Extracted {len(exercises)} exercise records")
        
    except Exception as e:
        print(f"  Error processing {tab_name}: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n\nTotal exercise records: {len(all_exercises)}")
    
    if all_exercises:
        # Show sample records
        print("\nSample exercise records:")
        for i, ex in enumerate(all_exercises[:15]):
            day_str = f"Day {ex.get('day_number', 'N/A')}" if ex.get('day_number') else "Day N/A"
            notes_str = f" ({ex['notes']})" if ex.get('notes') else ""
            print(f"  {i+1}. {ex['program_name']} - Week {ex['week_number']}, {day_str}: {ex['exercise_name']} - {ex.get('reps', 'N/A')} reps @ {ex.get('weights', 'N/A')}kg{notes_str}")
        
        # Save to CSV
        save_exercises_to_csv(all_exercises, 'workout_program.csv')
        
        # Create summary
        print("\nProgram Summary:")
        programs = {}
        for ex in all_exercises:
            prog = ex['program_name']
            if prog not in programs:
                programs[prog] = {'weeks': set(), 'exercises': set(), 'days': set()}
            programs[prog]['weeks'].add(ex['week_number'])
            programs[prog]['exercises'].add(ex['exercise_name'])
            if ex.get('day_number'):
                programs[prog]['days'].add(ex['day_number'])
        
        for prog, data in programs.items():
            days_str = f", {len(data['days'])} days" if data['days'] else ""
            print(f"  {prog}: {len(data['weeks'])} weeks, {len(data['exercises'])} exercise types{days_str}")
    else:
        print("\nNo exercises found. The sheet structure may need adjustment.")

if __name__ == "__main__":
    main()
