// The job identifier and lift serial are the same number. Keep the job's
// display prefix while using its numeric value in document serial fields.
export function serialFromJob(jobNo) {
  return String(jobNo ?? '').trim().match(/^(?:J#?)?(\d{2,5})$/i)?.[1] || '';
}
