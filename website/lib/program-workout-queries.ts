import { supabase } from './supabase';
import { ProgramDay, WorkoutRating } from '@/types/program-workout';

/**
 * Get program day for a specific day
 */
export async function getProgramDay(
  userId: string,
  athleteName: string,
  programName: string,
  startDate: string,
  weekNumber: number,
  dayNumber: number
) {
  const { data, error } = await supabase
    .from('program_days')
    .select('*')
    .eq('user_id', userId)
    .eq('athlete_name', athleteName)
    .eq('program_name', programName)
    .eq('start_date', startDate)
    .eq('week_number', weekNumber)
    .eq('day_number', dayNumber)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching program day:', error);
    throw error;
  }

  return data as ProgramDay | null;
}

/**
 * Get all program days for a specific athlete and program
 */
export async function getProgramDays(
  userId: string,
  athleteName: string,
  programName: string,
  startDate: string
) {
  const { data, error } = await supabase
    .from('program_days')
    .select('*')
    .eq('user_id', userId)
    .eq('athlete_name', athleteName)
    .eq('program_name', programName)
    .eq('start_date', startDate)
    .order('week_number')
    .order('day_number');

  if (error) {
    console.error('Error fetching program days:', error);
    throw error;
  }

  return data as ProgramDay[];
}

/**
 * Upsert (insert or update) a program day
 */
export async function upsertProgramDay(day: Omit<ProgramDay, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('program_days')
    .upsert(day, {
      onConflict: 'user_id,athlete_name,program_name,start_date,week_number,day_number'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting program day:', error);
    throw error;
  }

  return data as ProgramDay;
}

/**
 * Mark a workout day as completed
 */
export async function markDayCompleted(
  userId: string,
  athleteName: string,
  programName: string,
  startDate: string,
  weekNumber: number,
  dayNumber: number,
  completed: boolean
) {
  const day: Omit<ProgramDay, 'id' | 'created_at' | 'updated_at'> = {
    user_id: userId,
    athlete_name: athleteName,
    program_name: programName,
    start_date: startDate,
    week_number: weekNumber,
    day_number: dayNumber,
    completed,
    rating: null
  };

  return await upsertProgramDay(day);
}

/**
 * Update day rating
 */
export async function updateDayRating(
  userId: string,
  athleteName: string,
  programName: string,
  startDate: string,
  weekNumber: number,
  dayNumber: number,
  rating: WorkoutRating
) {
  // First, get the current day or create default values
  const existing = await getProgramDay(userId, athleteName, programName, startDate, weekNumber, dayNumber);

  const day: Omit<ProgramDay, 'id' | 'created_at' | 'updated_at'> = {
    user_id: userId,
    athlete_name: athleteName,
    program_name: programName,
    start_date: startDate,
    week_number: weekNumber,
    day_number: dayNumber,
    completed: existing?.completed ?? false,
    rating
  };

  return await upsertProgramDay(day);
}

/**
 * Delete all program days for a specific program
 */
export async function deleteProgramDays(
  userId: string,
  athleteName: string,
  programName: string,
  startDate: string
) {
  const { error } = await supabase
    .from('program_days')
    .delete()
    .eq('user_id', userId)
    .eq('athlete_name', athleteName)
    .eq('program_name', programName)
    .eq('start_date', startDate);

  if (error) {
    console.error('Error deleting program days:', error);
    throw error;
  }

  return true;
}
