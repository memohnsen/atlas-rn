export const parseCount = (value: string) => {
  const match = value.match(/(\d+(\.\d+)?)/)
  return match ? Number.parseFloat(match[1]) : null
}

export const parseIntensityValues = (value: string) =>
  [...value.matchAll(/\d+(\.\d+)?/g)]
    .map((match) => Number.parseFloat(match[0]))
    .filter((number) => !Number.isNaN(number))

export const parseRepsValues = (value: string) => {
  // Extract all numbers and number ranges from the string
  const matches = [...value.matchAll(/(\d+)(-\d+)?/g)]
  return matches.map((match) => match[0]) // Keep as strings to preserve ranges like "10-15"
}
