import { supabase } from './supabase';
import {
  ProgramLibraryRecord,
  ProgramLibraryTemplate,
  ProgramMetadata,
  WorkoutRecord
} from '@/types/workout';
import { AthletePRs } from '@/types/athlete-prs';
import { ProgramDay } from '@/types/program-workout';

export type ExerciseLibraryEntry = {
  id: number;
  name: string | null;
  primary: string | null;
  secondary: string | null;
  link: string | null;
};

export async function getExerciseLibrary(limit = 500): Promise<ExerciseLibraryEntry[]> {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('id,name,primary,secondary,link')
    .order('primary', { ascending: true })
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error loading exercise library:', error);
    throw error;
  }

  return data ?? [];
}

export async function searchExerciseLibrary(query: string, limit = 20): Promise<ExerciseLibraryEntry[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const { data, error } = await supabase
    .from('exercise_library')
    .select('id,name,primary,secondary,link')
    .ilike('name', `%${trimmed}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error searching exercise library:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * Extract unique day records from workout data
 */
function extractProgramDays(workouts: Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>[]): Omit<ProgramDay, 'id' | 'created_at' | 'updated_at'>[] {
  const uniqueDays = new Map<string, Omit<ProgramDay, 'id' | 'created_at' | 'updated_at'>>();

  workouts.forEach(workout => {
    // Skip if day_number is null
    if (workout.day_number === null) return;

    const key = `${workout.user_id}-${workout.athlete_name}-${workout.program_name}-${workout.start_date}-${workout.week_number}-${workout.day_number}`;

    if (!uniqueDays.has(key)) {
      const dayOfWeek = workout.day_of_week?.trim() || null
      uniqueDays.set(key, {
        user_id: workout.user_id,
        athlete_name: workout.athlete_name,
        program_name: workout.program_name,
        start_date: workout.start_date,
        week_number: workout.week_number,
        day_number: workout.day_number,
        day_of_week: dayOfWeek,
        completed: false,
        rating: null
      });
    } else {
      const existing = uniqueDays.get(key);
      if (existing && !existing.day_of_week && workout.day_of_week?.trim()) {
        existing.day_of_week = workout.day_of_week.trim();
      }
    }
  });

  return Array.from(uniqueDays.values());
}

/**
 * Insert a single workout record
 */
export async function insertWorkout(workout: Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('program_workouts')
    .insert([workout])
    .select()
    .single();

  if (error) {
    console.error('Error inserting workout:', error);
    throw error;
  }

  // Also create program_days record for this day if it doesn't exist
  if (workout.day_number !== null) {
    const programDay: Omit<ProgramDay, 'id' | 'created_at' | 'updated_at'> = {
      user_id: workout.user_id,
      athlete_name: workout.athlete_name,
      program_name: workout.program_name,
      start_date: workout.start_date,
      week_number: workout.week_number,
      day_number: workout.day_number,
      day_of_week: workout.day_of_week?.trim() || null,
      completed: false,
      rating: null
    };

    const { error: programError } = await supabase
      .from('program_days')
      .upsert(programDay, {
        onConflict: 'user_id,athlete_name,program_name,start_date,week_number,day_number',
        ignoreDuplicates: true
      });

    if (programError) {
      console.error('Error creating program day record:', programError);
      // Don't throw - workout was created successfully
    }
  }

  return data;
}

/**
 * Insert multiple workout records and create corresponding program_workout records
 */
export async function insertManyWorkouts(workouts: Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>[]) {
  // Insert workouts
  const { data, error } = await supabase
    .from('program_workouts')
    .insert(workouts)
    .select();

  if (error) {
    console.error('Error inserting workouts:', error);
    throw error;
  }

  // Extract unique days and create program_days records
  const programDays = extractProgramDays(workouts);

  if (programDays.length > 0) {
    const { error: programError } = await supabase
      .from('program_days')
      .upsert(programDays, {
        onConflict: 'user_id,athlete_name,program_name,start_date,week_number,day_number',
        ignoreDuplicates: true
      });

    if (programError) {
      console.error('Error creating program day records:', programError);
      // Don't throw - workouts were created successfully
    }
  }

  return data;
}

/**
 * Insert multiple program library workout records
 */
export async function insertManyLibraryWorkouts(
  workouts: Omit<ProgramLibraryRecord, 'id' | 'created_at' | 'updated_at'>[]
) {
  const { data, error } = await supabase
    .from('program_library_workouts')
    .insert(workouts)
    .select();

  if (error) {
    console.error('Error inserting library workouts:', error);
    throw error;
  }

  return data;
}

/**
 * Replace all workouts for a program in the library
 */
export async function replaceLibraryProgramWorkouts(
  programName: string,
  workouts: Omit<ProgramLibraryRecord, 'id' | 'created_at' | 'updated_at'>[]
) {
  const { error: deleteError } = await supabase
    .from('program_library_workouts')
    .delete()
    .eq('program_name', programName);

  if (deleteError) {
    console.error('Error deleting library workouts:', deleteError);
    throw deleteError;
  }

  return insertManyLibraryWorkouts(workouts);
}

/**
 * Get all unique athletes
 */
export async function getAthletes() {
  const { data, error } = await supabase
    .from('program_workouts')
    .select('athlete_name')
    .order('athlete_name');

  if (error) {
    console.error('Error fetching athletes:', error);
    throw error;
  }

  // Get unique athlete names
  const uniqueAthletes = [...new Set(data.map(item => item.athlete_name))];
  return uniqueAthletes;
}

export type AthleteScheduleSummary = {
  athlete_name: string;
  last_session_date: string | null;
  days_remaining: number | null;
};

function parseIsoDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateSessionDate(
  startDate: string,
  weekNumber: number,
  dayNumber: number
) {
  const baseDate = parseIsoDate(startDate);
  if (!baseDate) {
    return null;
  }

  const offsetDays = (weekNumber - 1) * 7 + (dayNumber - 1);
  const sessionDate = new Date(baseDate);
  sessionDate.setUTCDate(sessionDate.getUTCDate() + offsetDays);
  return sessionDate;
}

function calculateDaysRemaining(targetDate: Date) {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffMs = targetDate.getTime() - todayUtc.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export async function getAthleteScheduleSummaries(): Promise<AthleteScheduleSummary[]> {
  const { data, error } = await supabase
    .from('program_days')
    .select('athlete_name,start_date,week_number,day_number')
    .order('athlete_name');

  if (error) {
    console.error('Error fetching athlete schedules:', error);
    throw error;
  }

  const sessionsByAthlete = new Map<string, Date>();

  (data ?? []).forEach((record) => {
    if (!record.athlete_name || !record.start_date || record.day_number == null) {
      return;
    }

    const sessionDate = calculateSessionDate(
      record.start_date,
      record.week_number,
      record.day_number
    );

    if (!sessionDate) {
      return;
    }

    const existing = sessionsByAthlete.get(record.athlete_name);
    if (!existing || sessionDate > existing) {
      sessionsByAthlete.set(record.athlete_name, sessionDate);
    }
  });

  const summaries = Array.from(sessionsByAthlete.entries()).map(([athleteName, lastDate]) => ({
    athlete_name: athleteName,
    last_session_date: lastDate.toISOString().split('T')[0],
    days_remaining: calculateDaysRemaining(lastDate)
  }));

  return summaries.sort((a, b) => a.athlete_name.localeCompare(b.athlete_name));
}

/**
 * Get all programs for a specific athlete
 */
export async function getProgramsForAthlete(athleteName: string) {
  const { data, error } = await supabase
    .from('program_workouts')
    .select('program_name, start_date')
    .eq('athlete_name', athleteName)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching programs:', error);
    throw error;
  }

  // Get unique program/start_date combinations
  const uniquePrograms = Array.from(
    new Map(
      data.map(item => [`${item.program_name}-${item.start_date}`, item])
    ).values()
  );

  return uniquePrograms;
}

/**
 * Get all workouts for a specific athlete and program
 */
export async function getWorkoutsForAthleteProgram(
  athleteName: string,
  programName: string,
  startDate?: string
) {
  let query = supabase
    .from('program_workouts')
    .select('*')
    .eq('athlete_name', athleteName)
    .eq('program_name', programName)
    .order('week_number')
    .order('day_number', { nullsFirst: false })
    .order('exercise_number')

  if (startDate) {
    query = query.eq('start_date', startDate)
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }

  return data as WorkoutRecord[];
}

/**
 * Get all workouts for a specific athlete across programs
 */
export async function getWorkoutsForAthlete(athleteName: string) {
  const { data, error } = await supabase
    .from('program_workouts')
    .select('*')
    .eq('athlete_name', athleteName)
    .order('start_date', { ascending: false })
    .order('week_number')
    .order('day_number', { nullsFirst: false })
    .order('exercise_number')

  if (error) {
    console.error('Error fetching workouts for athlete:', error)
    throw error
  }

  return data as WorkoutRecord[]
}

/**
 * Check if a program already exists for an athlete
 */
export async function checkProgramExists(athleteName: string, programName: string) {
  const { data, error } = await supabase
    .from('program_workouts')
    .select('id')
    .eq('athlete_name', athleteName)
    .eq('program_name', programName)
    .limit(1);

  if (error) {
    console.error('Error checking program existence:', error);
    throw error;
  }

  return data.length > 0;
}

/**
 * Check if a program already exists in the library
 */
export async function checkLibraryProgramExists(programName: string) {
  const { data, error } = await supabase
    .from('program_library_workouts')
    .select('id')
    .eq('program_name', programName)
    .limit(1);

  if (error) {
    console.error('Error checking library program existence:', error);
    throw error;
  }

  return data.length > 0;
}

export type LibraryProgramSummary = {
  program_name: string;
  created_at: string | null;
};

/**
 * Get all saved programs in the library
 */
export async function getLibraryPrograms(): Promise<LibraryProgramSummary[]> {
  const { data, error } = await supabase
    .from('program_library_workouts')
    .select('program_name, created_at')
    .order('program_name', { ascending: true });

  if (error) {
    console.error('Error fetching library programs:', error);
    throw error;
  }

  const uniquePrograms = Array.from(
    new Map(
      (data ?? []).map(item => [item.program_name, item])
    ).values()
  );

  return uniquePrograms;
}

/**
 * Get a library program's template metadata
 */
export async function getLibraryProgramTemplate(programName: string) {
  const { data, error } = await supabase
    .from('program_library_templates')
    .select('program_name, rep_targets, week_totals, week_count, created_at, updated_at')
    .eq('program_name', programName)
    .maybeSingle();

  if (error) {
    console.error('Error fetching library program template:', error);
    throw error;
  }

  return (data ?? null) as ProgramLibraryTemplate | null;
}

/**
 * Get all workouts for a program in the library
 */
export async function getLibraryProgramWorkouts(programName: string) {
  const { data, error } = await supabase
    .from('program_library_workouts')
    .select('*')
    .eq('program_name', programName)
    .order('week_number')
    .order('day_number', { nullsFirst: false })
    .order('exercise_number');

  if (error) {
    console.error('Error fetching library program workouts:', error);
    throw error;
  }

  return data as ProgramLibraryRecord[];
}

/**
 * Upsert a library program template metadata entry
 */
export async function upsertLibraryProgramTemplate(
  template: Omit<ProgramLibraryTemplate, 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('program_library_templates')
    .upsert(template, { onConflict: 'program_name' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting library program template:', error);
    throw error;
  }

  return data as ProgramLibraryTemplate;
}

/**
 * Upsert program metadata for an athlete program
 */
export async function upsertProgramMetadata(
  metadata: Omit<ProgramMetadata, 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('program_metadata')
    .upsert(metadata, { onConflict: 'athlete_name,program_name,start_date' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting program metadata:', error);
    throw error;
  }

  return data as ProgramMetadata;
}

/**
 * Assign a library program to an athlete
 */
export async function assignLibraryProgramToAthlete(
  libraryProgramName: string,
  athleteName: string,
  programName: string,
  startDate: string
) {
  const libraryWorkouts = await getLibraryProgramWorkouts(libraryProgramName);
  const libraryTemplate = await getLibraryProgramTemplate(libraryProgramName);
  if (libraryWorkouts.length === 0) {
    throw new Error('No workouts found in the selected library program.');
  }

  const workouts: Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>[] = libraryWorkouts.map(
    (workout) => ({
      user_id: workout.user_id,
      athlete_name: athleteName,
      program_name: programName,
      start_date: startDate,
      week_number: workout.week_number,
      day_number: workout.day_number,
      exercise_number: workout.exercise_number,
      exercise_name: workout.exercise_name,
      superset_group: workout.superset_group ?? null,
      superset_order: workout.superset_order ?? null,
      sets: workout.sets,
      reps: workout.reps,
      weights: workout.weights,
      percent: workout.percent,
      athlete_comments: null,
      completed: false
    })
  );

  await insertManyWorkouts(workouts);
  const fallbackTemplate = libraryTemplate ?? {
    program_name: libraryProgramName,
    rep_targets: { snatch: '', clean: '', jerk: '', squat: '', pull: '' },
    week_totals: [],
    week_count: Math.max(...libraryWorkouts.map((workout) => workout.week_number))
  };

  await upsertProgramMetadata({
    athlete_name: athleteName,
    program_name: programName,
    start_date: startDate,
    rep_targets: fallbackTemplate.rep_targets,
    week_totals: fallbackTemplate.week_totals,
    week_count: fallbackTemplate.week_count
  });

  return true;
}

/**
 * Update a workout's completed status
 */
export async function updateWorkoutCompleted(id: number, completed: boolean) {
  const { data, error } = await supabase
    .from('program_workouts')
    .update({ completed })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating workout:', error);
    throw error;
  }

  return data;
}

/**
 * Update a workout's athlete comments
 */
export async function updateAthleteComments(id: number, athleteComments: string | null) {
  const { data, error } = await supabase
    .from('program_workouts')
    .update({ athlete_comments: athleteComments })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating athlete comments:', error);
    throw error;
  }

  return data;
}

/**
 * Delete all workouts for a specific program
 */
export async function deleteProgram(
  athleteName: string,
  programName: string,
  startDate?: string
) {
  let query = supabase
    .from('program_workouts')
    .delete()
    .eq('athlete_name', athleteName)
    .eq('program_name', programName)

  if (startDate) {
    query = query.eq('start_date', startDate)
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting program:', error);
    throw error;
  }

  return true;
}

/**
 * Delete all program workouts, day records, and metadata for an athlete program.
 * Library templates/workouts are not affected.
 */
export async function deleteProgramData(
  athleteName: string,
  programName: string,
  startDate?: string
) {
  let daysQuery = supabase
    .from('program_days')
    .delete()
    .eq('athlete_name', athleteName)
    .eq('program_name', programName);

  if (startDate) {
    daysQuery = daysQuery.eq('start_date', startDate);
  }

  const { error: daysError } = await daysQuery;

  if (daysError) {
    console.error('Error deleting program days:', daysError);
    throw daysError;
  }

  let workoutsQuery = supabase
    .from('program_workouts')
    .delete()
    .eq('athlete_name', athleteName)
    .eq('program_name', programName);

  if (startDate) {
    workoutsQuery = workoutsQuery.eq('start_date', startDate);
  }

  const { error: workoutsError } = await workoutsQuery;

  if (workoutsError) {
    console.error('Error deleting program workouts:', workoutsError);
    throw workoutsError;
  }

  let metadataQuery = supabase
    .from('program_metadata')
    .delete()
    .eq('athlete_name', athleteName)
    .eq('program_name', programName);

  if (startDate) {
    metadataQuery = metadataQuery.eq('start_date', startDate);
  }

  const { error: metadataError } = await metadataQuery;

  if (metadataError) {
    console.error('Error deleting program metadata:', metadataError);
    throw metadataError;
  }

  return true;
}

/**
 * Delete all athlete workouts and related day/metadata records.
 * Library templates/workouts are not affected.
 */
export async function deleteAthleteData(athleteName: string) {
  const { error: daysError } = await supabase
    .from('program_days')
    .delete()
    .eq('athlete_name', athleteName);

  if (daysError) {
    console.error('Error deleting program days:', daysError);
    throw daysError;
  }

  const { error: workoutsError } = await supabase
    .from('program_workouts')
    .delete()
    .eq('athlete_name', athleteName);

  if (workoutsError) {
    console.error('Error deleting athlete workouts:', workoutsError);
    throw workoutsError;
  }

  const { error: metadataError } = await supabase
    .from('program_metadata')
    .delete()
    .eq('athlete_name', athleteName);

  if (metadataError) {
    console.error('Error deleting athlete metadata:', metadataError);
    throw metadataError;
  }

  const { error: prsError } = await supabase
    .from('athlete_prs')
    .delete()
    .eq('athlete_name', athleteName);

  if (prsError) {
    console.error('Error deleting athlete PRs:', prsError);
    throw prsError;
  }

  return true;
}

/**
 * Get athlete PRs
 */
export async function getAthletePRs(athleteName: string) {
  const { data, error } = await supabase
    .from('athlete_prs')
    .select('*')
    .eq('athlete_name', athleteName)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching athlete PRs:', error);
    throw error;
  }

  return (data as AthletePRs | null) ?? null;
}

/**
 * Upsert athlete PRs
 */
export async function upsertAthletePRs(prs: Omit<AthletePRs, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('athlete_prs')
    .upsert(prs, { onConflict: 'athlete_name' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting athlete PRs:', error);
    throw error;
  }

  return data as AthletePRs;
}
