// Reglas de contraseña — deben coincidir con las del backend (auth.js / profile.js)
export const PASSWORD_MIN = 6;

export interface PasswordCheck {
  minLength: boolean;
  hasNumber: boolean;
  valid: boolean;
}

export function checkPassword(pw: string): PasswordCheck {
  const minLength = pw.length >= PASSWORD_MIN;
  const hasNumber = /\d/.test(pw);
  return { minLength, hasNumber, valid: minLength && hasNumber };
}

// Mensaje de error listo para mostrar, o null si la contraseña es válida
export function passwordError(pw: string, confirm?: string): string | null {
  const { minLength, hasNumber } = checkPassword(pw);
  if (!minLength) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  if (!hasNumber) return 'La contraseña debe incluir al menos un número';
  if (confirm !== undefined && pw !== confirm) return 'Las contraseñas no coinciden';
  return null;
}
