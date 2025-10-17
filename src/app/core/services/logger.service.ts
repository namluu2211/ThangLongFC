import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private currentLevel: LogLevel = environment.production ? LogLevel.WARN : LogLevel.DEBUG;

  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, '🔍', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, 'ℹ️', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, '⚠️', message, args);
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, '❌', message, [error, ...args]);
  }

  success(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, '✅', message, args);
  }

  private log(level: LogLevel, icon: string, message: string, args: unknown[]): void {
    if (level < this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${icon} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  // Performance logging
  startTimer(label: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.time(label);
    }
  }

  endTimer(label: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.timeEnd(label);
    }
  }

  // Group logging for complex operations
  group(label: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }
}
