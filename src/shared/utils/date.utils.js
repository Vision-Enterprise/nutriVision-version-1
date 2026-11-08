/**
 * Date Utility Functions
 *
 * Reusable functions for formatting dates and calculating expiration statuses.
 */

import { EXPIRATION_THRESHOLDS, EXPIRATION_STATUS } from '../constants/app.constants.js';
import { resolveShelfLifePolicy } from './shelf-life.utils.js';

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
 * Determine the expiration status based on days remaining and optional commodity/batch policy (#98).
 *
 * Defaults to standard shelf-stable thresholds (Good >180d, Moderate 91-180d, Near <=90d)
 * when no context is passed, and dynamically applies per-commodity policies (e.g., 7-day
 * DOST-FNRI Nutribun weekly dispatch or custom RSL thresholds) when batch/commodity context is provided.
 *
 * @param {string|Date} expirationDate
 * @param {Object|null} [context=null] - Optional batch or commodity object
 * @returns {string} - From EXPIRATION_STATUS constants
 */
export function getExpirationStatus(expirationDate, context = null) {
  if (!expirationDate) return EXPIRATION_STATUS.GOOD;
  
  const daysRemaining = getDaysRemaining(expirationDate);
  const policy = context ? resolveShelfLifePolicy(context) : null;
  const nearExpiryDays = policy ? policy.nearExpiryDays : EXPIRATION_THRESHOLDS.NEAR_EXPIRY_DAYS;
  const goodDays = policy ? policy.goodDays : EXPIRATION_THRESHOLDS.GOOD_DAYS;
  
  if (daysRemaining <= 0) {
    return EXPIRATION_STATUS.EXPIRED;
  }
  if (daysRemaining <= nearExpiryDays) {
    return EXPIRATION_STATUS.NEAR_EXPIRY;
  }
  if (daysRemaining <= goodDays) {
    return EXPIRATION_STATUS.MODERATE;
  }
  
  return EXPIRATION_STATUS.GOOD;
}

/**
 * Adds whole calendar days to a YYYY-MM-DD local date string without UTC drift.
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days - Number of days to add
 * @returns {string} - YYYY-MM-DD
 */
export function addDaysToDateString(dateStr, days) {
  const numDays = parseInt(days, 10);
  if (!dateStr || isNaN(numDays)) return '';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  let d;
  if (match) {
    d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + numDays);
  return getLocalDateString(d);
}

/**
 * Returns local calendar date formatted as YYYY-MM-DD.
 * Avoids UTC timezone rollback from toISOString() in UTC+ timezones.
 *
 * @param {string|Date} [date=new Date()]
 * @returns {string} - YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
