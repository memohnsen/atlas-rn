export type AssignmentState = {
  athleteName: string
  programName: string
  startDate: string
  status: 'idle' | 'assigning' | 'success' | 'error'
  message?: string
}

export const getAssignment = (
  programName: string,
  source: Record<string, AssignmentState>
): AssignmentState => {
  if (source[programName]) {
    return source[programName]
  }
  return {
    athleteName: '',
    programName,
    startDate: '',
    status: 'idle'
  }
}

export const updateAssignmentState = (
  prev: Record<string, AssignmentState>,
  programName: string,
  updates: Partial<AssignmentState>
) => ({
  ...prev,
  [programName]: {
    ...getAssignment(programName, prev),
    ...updates
  }
})
