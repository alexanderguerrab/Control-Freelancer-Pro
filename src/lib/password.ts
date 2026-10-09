/** Requisitos de contraseña (deben coincidir con config.toml → password_requirements). */
export const REQUISITOS_PASSWORD = [
  { texto: 'Mínimo 8 caracteres', ok: (p: string) => p.length >= 8 },
  { texto: 'Al menos 1 letra mayúscula', ok: (p: string) => /[A-Z]/.test(p) },
  { texto: 'Al menos 1 letra minúscula', ok: (p: string) => /[a-z]/.test(p) },
  { texto: 'Al menos 1 número', ok: (p: string) => /[0-9]/.test(p) },
  { texto: 'Al menos 1 carácter especial (ej. @, #, !, $)', ok: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export function primerRequisitoFallido(password: string) {
  return REQUISITOS_PASSWORD.find((r) => !r.ok(password)) ?? null
}
