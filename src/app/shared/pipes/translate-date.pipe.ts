import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translateDate'
})
export class TranslateDatePipe implements PipeTransform {

  transform(value: string | Date, ...args: any[]): string {
    if (!value) return '';

    const date = new Date(value);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };

    // Configura el idioma a español
    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }
}
