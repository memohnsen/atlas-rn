export const parseCount = (value: string) => {
  const match = value.match(/(\d+(\.\d+)?)/)
  return match ? Number.parseFloat(match[1]) : null
}

export const parseIntensityValues = (value: string) =>
  [...value.matchAll(/\d+(\.\d+)?/g)]
    .map((match) => Number.parseFloat(match[0]))
    .filter((number) => !Number.isNaN(number))
