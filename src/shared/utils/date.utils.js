/**
 * Date Utility Functions
 *
 * Reusable functions for formatting dates and calculating expiration statuses.
 */

import { EXPIRATION_THRESHOLDS, EXPIRATION_STATUS } from '../constants/app.constants.js';

/**
 * Format a timestamp into a readable date string.
 * Example: 'August 13, 2026'
 *
 * @param {string|Date} dateString 
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Format a timestamp into a readable date and time string.
 * Example: 'Aug 13, 2026, 10:45 AM'
 *
 * @param {string|Date} dateString 
 * @returns {string}
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

/**
 * Calculate the number of days between today and a given date.
 * Positive number means the date is in the future.
 * Negative number means the date is in the past.
 *
 * @param {string|Date} targetDate 
 * @returns {number}
 */
export function getDaysRemaining(targetDate) {
  if (!targetDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Determine the expiration status based on days remaining.
 *
 * @param {string|Date} expirationDate 
 * @returns {string} - From EXPIRATION_STATUS constants
 */
export function getExpirationStatus(expirationDate) {
  if (!expirationDate) return EXPIRATION_STATUS.GOOD;
  
  const daysRemaining = getDaysRemaining(expirationDate);
  
  if (daysRemaining <= 0) {
    return EXPIRATION_STATUS.EXPIRED;
  }
  if (daysRemaining <= EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS) {
    return EXPIRATION_STATUS.NEAR_EXPIRY;
  }
  if (daysRemaining <= EXPIRATION_THRESHOLDS.GOOD_DAYS) {
    return EXPIRATION_STATUS.MODERATE;
  }
  
  return EXPIRATION_STATUS.GOOD;
}
