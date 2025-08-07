/**
 * Logger utility for bar-buddy app
 * Provides logging to both console and file for debugging purposes
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Log file path
const LOG_FILE_PATH = `${FileSystem.documentDirectory}bar_buddy_logs.txt`;

/**
 * Logger class for bar-buddy app
 */
class Logger {
  private static instance: Logger;
  private logBuffer: string[] = [];
  private isWriting: boolean = false;
  private maxBufferSize: number = 20;

  private constructor() {
    // Initialize log file
    this.initLogFile();
  }

  /**
   * Get logger instance (singleton)
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize log file
   */
  private async initLogFile() {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(LOG_FILE_PATH);
      if (!fileInfo.exists) {
        // Create file
        await FileSystem.writeAsStringAsync(
          LOG_FILE_PATH,
          `=== bar-buddy Log Started ${new Date().toISOString()} ===\n`
        );
      } else {
        // Check file size and truncate if too large (keep last 100KB)
        if (fileInfo.size > 500000) { // 500KB
          const content = await FileSystem.readAsStringAsync(LOG_FILE_PATH);
          const truncated = content.substring(content.length - 100000);
          await FileSystem.writeAsStringAsync(
            LOG_FILE_PATH,
            `=== Log Truncated ${new Date().toISOString()} ===\n${truncated}`
          );
        }
      }
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  /**
   * Write buffered logs to file
   */
  private async flushLogs() {
    if (this.isWriting || this.logBuffer.length === 0) return;
    
    this.isWriting = true;
    const logs = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      await FileSystem.writeAsStringAsync(LOG_FILE_PATH, await FileSystem.readAsStringAsync(LOG_FILE_PATH) + logs.join('\n') + '\n');
    } catch (error) {
      console.error('Failed to write logs to file:', error);
      // Put logs back in buffer
      this.logBuffer = [...logs, ...this.logBuffer];
    } finally {
      this.isWriting = false;
      
      // Check if more logs need to be flushed
      if (this.logBuffer.length > 0) {
        setTimeout(() => this.flushLogs(), 100);
      }
    }
  }

  /**
   * Format log message
   */
  private formatLog(level: LogLevel, tag: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${level} [${tag}]: ${message}`;
    
    if (data) {
      try {
        if (typeof data === 'object') {
          logMessage += ` - ${JSON.stringify(data)}`;
        } else {
          logMessage += ` - ${data}`;
        }
      } catch (error) {
        logMessage += ' - [Object cannot be stringified]';
      }
    }
    
    return logMessage;
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, tag: string, message: string, data?: any) {
    const formattedLog = this.formatLog(level, tag, message, data);
    
    // Log to console
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
    }
    
    // Add to buffer
    this.logBuffer.push(formattedLog);
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  /**
   * Log debug message
   */
  public debug(tag: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, tag, message, data);
  }

  /**
   * Log info message
   */
  public info(tag: string, message: string, data?: any) {
    this.log(LogLevel.INFO, tag, message, data);
  }

  /**
   * Log warning message
   */
  public warn(tag: string, message: string, data?: any) {
    this.log(LogLevel.WARN, tag, message, data);
  }

  /**
   * Log error message
   */
  public error(tag: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, tag, message, data);
  }

  /**
   * Get logs as string
   */
  public async getLogs(): Promise<string> {
    try {
      // Flush any pending logs
      await this.flushLogs();
      
      // Read log file
      return await FileSystem.readAsStringAsync(LOG_FILE_PATH);
    } catch (error) {
      console.error('Failed to read logs:', error);
      return 'Failed to read logs';
    }
  }

  /**
   * Export logs to a file that can be shared
   */
  public async exportLogs(): Promise<string | null> {
    try {
      // Flush any pending logs
      await this.flushLogs();
      
      // Create export file in cache directory
      const exportPath = `${FileSystem.cacheDirectory}bar_buddy_logs_${Date.now()}.txt`;
      await FileSystem.copyAsync({
        from: LOG_FILE_PATH,
        to: exportPath
      });
      
      return exportPath;
    } catch (error) {
      console.error('Failed to export logs:', error);
      return null;
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export default for convenience
export default logger;
