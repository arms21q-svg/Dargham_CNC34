export function generateEmployeePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += chars[values[i]! % chars.length]
  }
  return password
}

export const EMPLOYEE_JOB_ROLES = [
  { value: 'مسؤول لوحة التحكم', label: 'مسؤول لوحة التحكم' },
  { value: 'محرر محتوى', label: 'محرر محتوى' },
  { value: 'مشرف أعمال', label: 'مشرف أعمال' },
  { value: 'دعم فني', label: 'دعم فني' },
] as const
