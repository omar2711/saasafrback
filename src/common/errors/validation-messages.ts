import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * class-validator emite sus mensajes en ingles y el ValidationPipe los entrega
 * como array, asi que el usuario veia cosas como
 * "name should not be empty,email must be an email".
 *
 * Aqui se traduce por clave de restriccion. Las claves desconocidas caen al
 * mensaje original en vez de perderse: es preferible un texto en ingles a uno
 * generico que no dice que campo esta mal.
 */
const TEMPLATES: Record<string, (field: string, message: string) => string> = {
  isNotEmpty: (f) => `${f} es obligatorio.`,
  isDefined: (f) => `${f} es obligatorio.`,
  isString: (f) => `${f} debe ser texto.`,
  isNumber: (f) => `${f} debe ser un numero.`,
  isInt: (f) => `${f} debe ser un numero entero.`,
  isBoolean: (f) => `${f} debe ser verdadero o falso.`,
  isArray: (f) => `${f} debe ser una lista.`,
  arrayNotEmpty: (f) => `${f} no puede estar vacio.`,
  isPositive: (f) => `${f} debe ser mayor que cero.`,
  isEmail: (f) => `${f} debe ser un correo electronico valido.`,
  isUuid: (f) => `${f} no tiene un formato valido.`,
  isDateString: (f) => `${f} debe ser una fecha valida.`,
  isIso8601: (f) => `${f} debe ser una fecha valida.`,
  matches: (f) => `${f} no tiene el formato esperado.`,
  min: (f, m) => `${f} debe ser al menos ${extractNumber(m)}.`,
  max: (f, m) => `${f} no puede ser mayor que ${extractNumber(m)}.`,
  minLength: (f, m) => `${f} debe tener al menos ${extractNumber(m)} caracteres.`,
  maxLength: (f, m) => `${f} no puede tener mas de ${extractNumber(m)} caracteres.`,
  isIn: (f, m) => `${f} tiene un valor no permitido${extractList(m)}.`,
  isEnum: (f, m) => `${f} tiene un valor no permitido${extractList(m)}.`,
  whitelistValidation: (f) => `${f} no es un campo admitido.`,
};

export function buildValidationException(errors: ValidationError[]): BadRequestException {
  const messages = flatten(errors, []);
  return new BadRequestException({
    message: messages.length > 0 ? messages : ['Los datos enviados no son validos.'],
    code: 'VALIDATION_ERROR',
    details: messages,
  });
}

function flatten(errors: ValidationError[], path: string[]): string[] {
  const output: string[] = [];

  for (const error of errors) {
    const currentPath = [...path, error.property];

    for (const [key, original] of Object.entries(error.constraints ?? {})) {
      const template = TEMPLATES[key];
      const field = humanize(currentPath);
      output.push(template ? template(field, original) : `${field}: ${original}`);
    }

    if (error.children?.length) {
      output.push(...flatten(error.children, currentPath));
    }
  }

  return output;
}

/**
 * "items.0.unitPrice" queda como "items #1 - Precio unitario" sin necesidad de
 * mantener un diccionario campo a campo: se separa el camelCase y se traducen
 * solo los indices numericos.
 */
function humanize(path: string[]): string {
  return path
    .map((segment) => (/^\d+$/.test(segment) ? `#${Number(segment) + 1}` : splitCamelCase(segment)))
    .join(' ');
}

function splitCamelCase(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function extractNumber(message: string): string {
  return /(-?\d+(?:\.\d+)?)/.exec(message)?.[1] ?? '';
}

function extractList(message: string): string {
  const match = /:\s*(.+)$/.exec(message);
  return match ? ` (permitidos: ${match[1]})` : '';
}
