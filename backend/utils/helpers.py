from datetime import datetime,timedelta,date
import re


def is_valid_email(email):
    """Check if the email is valid using regex.
    """
    pattern = r"^[^@]+@[^@]+\.[^@]+$"
    return bool(re.match(pattern, email))

def get_day_of_week(date_obj):
    """Return the day of the week for a given date object (e.g., 'Monday').
    """
    return date_obj.strftime('%A')


def sanitize_description(desc, max_length=1000):
    """Trim and clean up a description string."""
    if desc is None:
        return ""
    desc = desc.strip()
    return desc[:max_length]

def format_datetime(dt):
    """Format a datetime object as ISO string, or return None."""
    if dt is None:
        return None
    return dt.isoformat()

def safe_close(session):
    try:
        session.close()
    except:
        pass

    
from datetime import timedelta

def calculate_total_hours(morning_in, morning_out, afternoon_in, afternoon_out):
    total = timedelta()
    if morning_in and morning_out:
        total += datetime.combine(date.min, morning_out) - datetime.combine(date.min, morning_in)
    if afternoon_in and afternoon_out:
        total += datetime.combine(date.min, afternoon_out) - datetime.combine(date.min, afternoon_in)
    return total  # <-- Make sure this is a timedelta, not a string

def format_timedelta_to_time(td):
    if not isinstance(td, timedelta):
        return "0:00"
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{hours}:{minutes:02d}"

def parse_time(time_str):
    if not time_str:
        return None
    try:
        return datetime.strptime(time_str, '%H:%M').time()  # <-- FIXED
    except ValueError:
        raise ValueError('Invalid time format. Use HH:MM.')
    
def validate_time(time_str):
    if not time_str:
        return True  # Allow null/empty
    return bool(re.match(r'^\d{2}:\d{2}$', time_str))